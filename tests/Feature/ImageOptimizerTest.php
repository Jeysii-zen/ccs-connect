<?php

use App\Services\ImageOptimizer;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * @param  callable(GdImage): void|null  $draw
 */
function gdBytes(int $width, int $height, string $format = 'jpeg', ?callable $draw = null): string
{
    $image = imagecreatetruecolor($width, $height);
    imagefill($image, 0, 0, imagecolorallocate($image, 0, 0, 255));

    if ($draw) {
        $draw($image);
    }

    ob_start();
    $format === 'png' ? imagepng($image) : imagejpeg($image, null, 95);

    return (string) ob_get_clean();
}

/**
 * A JPEG with an EXIF APP1 segment carrying only the orientation tag.
 */
function withOrientation(string $jpeg, int $orientation): string
{
    $tiff = 'MM'."\x00\x2A".pack('N', 8) // big-endian header, IFD0 at 8
        .pack('n', 1)                     // one entry
        .pack('nnN', 0x0112, 3, 1).pack('n', $orientation)."\x00\x00"
        .pack('N', 0);                    // no next IFD
    $app1 = "Exif\x00\x00".$tiff;

    return "\xFF\xD8\xFF\xE1".pack('n', strlen($app1) + 2).$app1.substr($jpeg, 2);
}

function decoded(string $webp): GdImage
{
    $image = imagecreatefromstring($webp);
    expect($image)->not->toBeFalse();

    return $image;
}

function redAt(GdImage $image, int $x, int $y): bool
{
    $rgb = imagecolorsforindex($image, imagecolorat($image, $x, $y));

    return $rgb['red'] > 180 && $rgb['blue'] < 90;
}

beforeEach(function () {
    $this->optimizer = app(ImageOptimizer::class);
});

test('large photos are scaled to 1920px on the long side and saved as WebP', function () {
    $webp = $this->optimizer->toWebp(gdBytes(3000, 2000));

    expect(getimagesizefromstring($webp))
        ->{0}->toBe(1920)
        ->{1}->toBe(1280)
        ->mime->toBe('image/webp');
});

test('small images keep their size', function () {
    expect(getimagesizefromstring($this->optimizer->toWebp(gdBytes(800, 600, 'png'))))
        ->{0}->toBe(800)
        ->{1}->toBe(600);
});

test('transparency survives the conversion', function () {
    $png = gdBytes(50, 50, 'png', function (GdImage $image) {
        imagealphablending($image, false);
        imagesavealpha($image, true);
        imagefilledrectangle($image, 0, 0, 24, 49, imagecolorallocatealpha($image, 0, 0, 0, 127));
    });

    $image = decoded($this->optimizer->toWebp($png));

    expect(imagecolorsforindex($image, imagecolorat($image, 5, 5))['alpha'])->toBe(127)
        ->and(imagecolorsforindex($image, imagecolorat($image, 40, 5))['alpha'])->toBe(0);
});

test('phone photos are turned upright from their EXIF orientation', function (int $orientation, int $width, int $height, array $redCorner) {
    // 80x40, red block in the top-left corner.
    $jpeg = gdBytes(80, 40, 'jpeg', fn (GdImage $image) => imagefilledrectangle(
        $image, 0, 0, 15, 15, imagecolorallocate($image, 255, 0, 0)
    ));

    $image = decoded($this->optimizer->toWebp(withOrientation($jpeg, $orientation)));

    expect([imagesx($image), imagesy($image)])->toBe([$width, $height])
        ->and(redAt($image, ...$redCorner))->toBeTrue();
})->with([
    'upright (1)' => [1, 80, 40, [4, 4]],
    'upside down (3)' => [3, 80, 40, [75, 35]],
    'rotate 90 clockwise (6)' => [6, 40, 80, [35, 4]],
    'rotate 90 counter-clockwise (8)' => [8, 40, 80, [4, 75]],
]);

test('metadata such as GPS location is removed', function () {
    $webp = $this->optimizer->toWebp(withOrientation(gdBytes(60, 40), 1));

    expect($webp)->not->toContain('Exif');
});

test('files that are not images are rejected', function (string $bytes) {
    expect(fn () => $this->optimizer->toWebp($bytes, 'photo'))
        ->toThrow(ValidationException::class, 'The file is not a readable image.');
})->with([
    'text' => ['not an image at all'],
    'empty' => [''],
    'truncated JPEG' => [substr(gdBytes(100, 100), 0, 200)],
]);

test('huge images are rejected before decoding', function () {
    // A PNG header claiming 10000x10000 pixels (100 MP), with no image data.
    $png = "\x89PNG\r\n\x1a\n".pack('N', 13).'IHDR'.pack('NN', 10000, 10000)."\x08\x06\x00\x00\x00".pack('N', 0);

    expect(fn () => $this->optimizer->toWebp($png, 'poster'))
        ->toThrow(ValidationException::class, 'The image is too large. Use one under 50 megapixels.');
});

test('store() writes a WebP file to the given disk and folder', function () {
    Storage::fake('local');

    $path = $this->optimizer->store(UploadedFile::fake()->image('selfie.jpg', 2400, 1800), 'proofs/7', 'local', 'photo');

    expect($path)->toStartWith('proofs/7/')->toEndWith('.webp');
    Storage::disk('local')->assertExists($path);
    expect(getimagesizefromstring(Storage::disk('local')->get($path)))->{0}->toBe(1920);
});
