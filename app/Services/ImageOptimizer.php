<?php

namespace App\Services;

use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Re-encodes uploaded images as WebP, at most MAX_EDGE pixels on the long
 * side, so pages never download multi-megabyte originals. Re-encoding also
 * drops EXIF metadata (e.g. GPS location in phone photos).
 */
class ImageOptimizer
{
    public const MAX_EDGE = 1920;

    private const QUALITY = 82;

    // Decoding needs ~4 bytes per pixel; this keeps a tiny "decompression
    // bomb" file from exhausting memory.
    private const MAX_PIXELS = 50_000_000;

    /**
     * Stores $image on $disk under $directory and returns the stored path.
     *
     * @param  string  $field  form field named in validation errors
     */
    public function store(UploadedFile $image, string $directory, string $disk, string $field = 'image'): string
    {
        $webp = $this->toWebp((string) file_get_contents($image->getRealPath()), $field);
        $path = trim($directory, '/').'/'.Str::random(40).'.webp';

        if (! Storage::disk($disk)->put($path, $webp)) {
            throw new \RuntimeException('Failed to store image.');
        }

        return $path;
    }

    /**
     * @return string the WebP bytes
     */
    public function toWebp(string $bytes, string $field = 'image'): string
    {
        $size = @getimagesizefromstring($bytes);

        if ($size === false) {
            throw $this->error($field, 'The file is not a readable image.');
        }

        if ($size[0] * $size[1] > self::MAX_PIXELS) {
            throw $this->error($field, 'The image is too large. Use one under 50 megapixels.');
        }

        $image = @imagecreatefromstring($bytes);

        if ($image === false) {
            throw $this->error($field, 'The file is not a readable image.');
        }

        imagepalettetotruecolor($image);
        $image = $this->upright($image, $this->orientation($bytes));

        $width = imagesx($image);
        $height = imagesy($image);
        $scale = min(1, self::MAX_EDGE / max($width, $height));

        if ($scale < 1) {
            $resized = imagescale($image, max(1, (int) round($width * $scale)), max(1, (int) round($height * $scale)), IMG_BICUBIC);

            if ($resized === false) {
                throw new \RuntimeException('Failed to resize image.');
            }

            $image = $resized;
        }

        // Keep transparency (PNG logos, stickers).
        imagealphablending($image, false);
        imagesavealpha($image, true);

        ob_start();
        $encoded = imagewebp($image, null, self::QUALITY);
        $webp = (string) ob_get_clean();

        if (! $encoded || $webp === '') {
            throw new \RuntimeException('Failed to encode image.');
        }

        return $webp;
    }

    /**
     * Phone cameras store photos sideways plus an EXIF orientation tag;
     * re-encoding drops the tag, so the pixels are turned upright first.
     */
    private function upright(GdImage $image, int $orientation): GdImage
    {
        $rotate = fn (int $angle) => imagerotate($image, $angle, 0) ?: $image;

        switch ($orientation) {
            case 2:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 3:
                $image = $rotate(180);
                break;
            case 4:
                imageflip($image, IMG_FLIP_VERTICAL);
                break;
            case 5:
                $image = $rotate(-90);
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 6:
                $image = $rotate(-90);
                break;
            case 7:
                $image = $rotate(90);
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 8:
                $image = $rotate(90);
                break;
        }

        return $image;
    }

    /**
     * The EXIF orientation (1–8) of a JPEG, or 1 when absent. Read by hand
     * so the exif extension is not required on the server.
     */
    private function orientation(string $bytes): int
    {
        if (! str_starts_with($bytes, "\xFF\xD8")) {
            return 1;
        }

        $offset = 2;

        // Walk the JPEG segments up to the image data.
        while ($offset + 4 <= strlen($bytes) && $bytes[$offset] === "\xFF") {
            $marker = ord($bytes[$offset + 1]);
            $length = $this->read('n', $bytes, $offset + 2, 2);

            if ($length === null || $marker === 0xDA) {
                break;
            }

            if ($marker === 0xE1 && substr($bytes, $offset + 4, 6) === "Exif\0\0") {
                return $this->tiffOrientation(substr($bytes, $offset + 10, $length - 8));
            }

            $offset += 2 + $length;
        }

        return 1;
    }

    private function tiffOrientation(string $tiff): int
    {
        $order = substr($tiff, 0, 2);

        if ($order !== 'II' && $order !== 'MM') {
            return 1;
        }

        [$short, $long] = $order === 'II' ? ['v', 'V'] : ['n', 'N'];
        $ifd = $this->read($long, $tiff, 4, 4);
        $count = $ifd === null ? null : $this->read($short, $tiff, $ifd, 2);

        for ($i = 0; $count !== null && $i < $count; $i++) {
            $entry = $ifd + 2 + $i * 12;

            if ($this->read($short, $tiff, $entry, 2) === 0x0112) {
                $value = $this->read($short, $tiff, $entry + 8, 2);

                return $value !== null && $value >= 1 && $value <= 8 ? $value : 1;
            }
        }

        return 1;
    }

    private function read(string $format, string $bytes, int $at, int $size): ?int
    {
        if ($at < 0 || $at + $size > strlen($bytes)) {
            return null;
        }

        $value = unpack($format, $bytes, $at);

        return $value === false ? null : (int) $value[1];
    }

    private function error(string $field, string $message): ValidationException
    {
        return ValidationException::withMessages([$field => $message]);
    }
}
