<?php

namespace App\Console\Commands;

use App\Models\Announcement;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

class PublishScheduledAnnouncements extends Command
{
    protected $signature = 'announcements:publish-scheduled';

    protected $description = 'Publish announcements whose scheduled time has arrived';

    public function handle(): int
    {
        $publishedCount = 0;
        $failedCount = 0;

        Announcement::query()
            ->where('announcement_status', 'Scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->orderBy('scheduled_at')
            ->select('announcement_id')
            ->chunkById(
                100,
                function ($announcements) use (&$publishedCount, &$failedCount): void {
                    foreach ($announcements as $item) {
                        try {
                            $published = $this->publish((int) $item->announcement_id);
                        } catch (Throwable $exception) {
                            // One bad record must not block the rest of the batch.
                            report($exception);
                            $failedCount++;
                            $this->error("Failed to publish announcement #{$item->announcement_id}.");

                            continue;
                        }

                        if ($published) {
                            $publishedCount++;
                        }
                    }
                },
                'announcement_id',
                'announcement_id'
            );

        $this->info(
            "Published {$publishedCount} scheduled announcement(s)."
        );

        return $failedCount > 0 ? self::FAILURE : self::SUCCESS;
    }

    /**
     * Publish one due announcement under a row lock.
     */
    private function publish(int $announcementId): bool
    {
        return DB::transaction(function () use ($announcementId): bool {
            // Re-check under the lock: the record may have been edited,
            // deleted, or published by an overlapping run since selection.
            $announcement = Announcement::query()
                ->where('announcement_id', $announcementId)
                ->where('announcement_status', 'Scheduled')
                ->whereNotNull('scheduled_at')
                ->where('scheduled_at', '<=', now())
                ->lockForUpdate()
                ->first();

            if (! $announcement) {
                return false;
            }

            $announcement->update([
                'announcement_status' => 'Published',
                'published_at' => now(),
                'scheduled_at' => null,
            ]);

            return true;
        });
    }
}
