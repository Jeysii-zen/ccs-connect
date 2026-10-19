<?php

namespace App\Console\Commands;

use App\Services\ImageOptimizer;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * One-off backfill: re-encodes images uploaded before ImageOptimizer
 * existed. Each original is copied to storage/app/private/image-backups
 * first, and its database path is switched only after the new file is
 * written.
 */
class CompressImages extends Command
{
    protected $signature = 'images:compress {--dry-run : Report what would change without writing anything}';

    protected $description = 'Resize and convert previously uploaded images to WebP (originals are backed up)';

    private const BACKUP_DIRECTORY = 'image-backups';

    /** @var list<array{string, string, string}> table, column, disk */
    private const SOURCES = [
        ['announcement_images', 'image_path', 'public'],
        ['events', 'poster_path', 'public'],
        ['users', 'profile_picture_path', 'public'],
        ['event_registrations', 'proof_photo_path', 'local'],
    ];

    public function handle(ImageOptimizer $optimizer): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $converted = 0;
        $skipped = 0;
        $failed = 0;
        $before = 0;
        $after = 0;

        foreach (self::SOURCES as [$table, $column, $disk]) {
            // Distinct: one poster may be shared by several events.
            $paths = DB::table($table)
                ->whereNotNull($column)
                ->where($column, 'not like', '%.webp')
                ->distinct()
                ->pluck($column);

            foreach ($paths as $path) {
                $path = (string) $path;
                $storage = Storage::disk($disk);

                if (! $storage->exists($path)) {
                    $this->warn("Missing file, skipped: {$disk}:{$path}");
                    $skipped++;

                    continue;
                }

                $original = (string) $storage->get($path);

                try {
                    $webp = $optimizer->toWebp($original);
                } catch (ValidationException) {
                    $this->warn("Not a readable image, skipped: {$disk}:{$path}");
                    $skipped++;

                    continue;
                }

                if (strlen($webp) >= strlen($original)) {
                    $skipped++;

                    continue;
                }

                $newPath = preg_replace('/\.[^.\/]+$/', '', $path).'.webp';

                if ($dryRun) {
                    $this->line(sprintf('Would convert %s:%s (%s -> %s)', $disk, $path, $this->size(strlen($original)), $this->size(strlen($webp))));
                } else {
                    try {
                        $this->replace($table, $column, $disk, $path, $newPath, $original, $webp);
                    } catch (Throwable $exception) {
                        report($exception);
                        $this->error("Failed, left unchanged: {$disk}:{$path}");
                        $failed++;

                        continue;
                    }
                }

                $converted++;
                $before += strlen($original);
                $after += strlen($webp);
            }
        }

        $this->info(sprintf(
            '%s %d image(s): %s -> %s. Skipped %d, failed %d.%s',
            $dryRun ? 'Would convert' : 'Converted',
            $converted,
            $this->size($before),
            $this->size($after),
            $skipped,
            $failed,
            $dryRun || $converted === 0 ? '' : ' Originals: storage/app/private/'.self::BACKUP_DIRECTORY
        ));

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function replace(string $table, string $column, string $disk, string $path, string $newPath, string $original, string $webp): void
    {
        $storage = Storage::disk($disk);
        $backups = Storage::disk('local');
        $backupPath = self::BACKUP_DIRECTORY."/{$disk}/{$path}";

        if (! $backups->exists($backupPath) && ! $backups->put($backupPath, $original)) {
            throw new \RuntimeException("Could not back up {$disk}:{$path}.");
        }

        if ($storage->exists($newPath) || ! $storage->put($newPath, $webp)) {
            throw new \RuntimeException("Could not write {$disk}:{$newPath}.");
        }

        try {
            DB::table($table)->where($column, $path)->update([$column => $newPath]);
        } catch (Throwable $exception) {
            $storage->delete($newPath);

            throw $exception;
        }

        // The backup keeps the original; the old public copy is no longer used.
        $storage->delete($path);
    }

    private function size(int $bytes): string
    {
        return $bytes >= 1048576
            ? round($bytes / 1048576, 1).' MB'
            : round($bytes / 1024).' KB';
    }
}
