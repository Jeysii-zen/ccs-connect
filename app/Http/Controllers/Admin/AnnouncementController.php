<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreAnnouncementRequest;
use App\Http\Requests\Admin\UpdateAnnouncementRequest;
use App\Models\Announcement;
use App\Services\ActivityLogService;
use App\Services\ImageOptimizer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class AnnouncementController extends Controller
{
    public function index(): Response
    {
        $view = request()->query('view', 'announcements');

        if (! in_array($view, ['announcements', 'drafts', 'schedule'], true)) {
            $view = 'announcements';
        }

        $status = match ($view) {
            'drafts' => 'Draft',
            'schedule' => 'Scheduled',
            default => 'Published',
        };

        $announcements = Announcement::query()
            ->with(['creator:id,first_name,last_name', 'images'])
            ->where('announcement_status', $status)
            ->when(
                $view === 'announcements',
                fn ($query) => $query->whereNotNull('published_at')
            )
            ->when(
                $view === 'schedule',
                fn ($query) => $query->whereNotNull('scheduled_at')
            )
            ->tap(fn ($query) => match ($view) {
                // Newest post first; the id keeps equal times in a stable
                // order so loading more never repeats or skips a post.
                'announcements' => $query
                    ->latest('published_at')
                    ->latest('announcement_id'),
                'schedule' => $query->orderBy('scheduled_at'),
                default => $query->latest('created_at'),
            })
            ->paginate($this->perPage($view))
            ->withQueryString();

        $counts = [
            'announcements' => Announcement::query()
                ->where('announcement_status', 'Published')
                ->whereNotNull('published_at')
                ->count(),
            'drafts' => Announcement::query()
                ->where('announcement_status', 'Draft')
                ->count(),
            'schedule' => Announcement::query()
                ->where('announcement_status', 'Scheduled')
                ->whereNotNull('scheduled_at')
                ->count(),
        ];

        return Inertia::render('Admin/Announcements/Index', [
            'announcements' => $announcements,
            'currentView' => $view,
            'announcementCounts' => $counts,
        ]);
    }

    public function store(
        StoreAnnouncementRequest $request,
        ActivityLogService $activityLogService,
        ImageOptimizer $imageOptimizer
    ): RedirectResponse {
        $validated = $request->validated();
        $user = $request->user();
        $images = $request->file('images', []);
        $uploadedPaths = [];

        // New announcements start as drafts unless a status is chosen (SSD5).
        $status = $validated['announcement_status'] ?? 'Draft';
        $scheduledAt = $status === 'Scheduled'
            ? $this->toAppTimezone($validated['scheduled_at'])
            : null;

        try {
            DB::transaction(function () use (
                $validated,
                $user,
                $images,
                $status,
                $scheduledAt,
                $imageOptimizer,
                &$uploadedPaths
            ): void {
                $announcement = Announcement::create([
                    'created_by_user_id' => $user->id,
                    'title' => $validated['title'],
                    'description_content' => $validated['description_content'],

                    // Kept for compatibility with the existing non-null column.
                    'announcement_date' => $scheduledAt
                        ? Carbon::parse($scheduledAt, 'Asia/Manila')->toDateString()
                        : now()->toDateString(),

                    'announcement_status' => $status,
                    'published_at' => $status === 'Published' ? now() : null,
                    'scheduled_at' => $scheduledAt,
                ]);

                foreach ($images as $image) {
                    $path = $imageOptimizer->store($image, 'announcements', 'public', 'images');

                    $uploadedPaths[] = $path;

                    $announcement->images()->create([
                        'image_path' => $path,
                    ]);
                }
            });
        } catch (\Throwable $exception) {
            foreach ($uploadedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        $activityLogService->log(
            $user,
            'Created',
            'Announcement',
            "Created announcement: {$validated['title']}"
        );

        $message = match ($status) {
            'Published' => 'Announcement published successfully.',
            'Scheduled' => 'Announcement scheduled successfully.',
            default => 'Announcement saved as draft successfully.',
        };

        $redirectView = match ($status) {
            'Scheduled' => 'schedule',
            'Draft' => 'drafts',
            default => 'announcements',
        };

        return to_route('admin.announcements.index', [
            'view' => $redirectView,
        ])->with('success', $message);
    }

    public function update(
        UpdateAnnouncementRequest $request,
        Announcement $announcement,
        ActivityLogService $activityLogService,
        ImageOptimizer $imageOptimizer
    ): RedirectResponse {
        $validated = $request->validated();
        $user = $request->user();
        $images = $request->file('images', []);
        $uploadedPaths = [];
        $removedPaths = [];

        try {
            DB::transaction(function () use (
                $validated,
                $announcement,
                $images,
                $imageOptimizer,
                &$uploadedPaths,
                &$removedPaths
            ): void {
                $announcement->refresh();

                $wasPublished = $announcement->announcement_status === 'Published'
                    && $announcement->published_at !== null;

                $status = $validated['announcement_status'];

                $scheduledAt = $status === 'Scheduled'
                    ? $this->toAppTimezone($validated['scheduled_at'])
                    : null;

                $publishedAt = match ($status) {
                    'Published' => $wasPublished
                        ? $announcement->published_at
                        : now(),
                    default => null,
                };

                $announcement->update([
                    'title' => $validated['title'],
                    'description_content' => $validated['description_content'],

                    // Preserve the existing required database column.
                    'announcement_date' => $scheduledAt
                        ? Carbon::parse($scheduledAt, 'Asia/Manila')->toDateString()
                        : ($announcement->announcement_date
                            ? Carbon::parse(
                                $announcement->announcement_date
                            )->toDateString()
                            : now()->toDateString()),

                    'announcement_status' => $status,
                    'published_at' => $publishedAt,
                    'scheduled_at' => $scheduledAt,
                ]);

                $removeIds = $validated['remove_image_ids'] ?? [];

                if ($removeIds !== []) {
                    $imagesToRemove = $announcement->images()
                        ->whereIn('announcement_image_id', $removeIds)
                        ->get();

                    foreach ($imagesToRemove as $image) {
                        $removedPaths[] = $image->image_path;
                        $image->delete();
                    }
                }

                foreach ($images as $image) {
                    $path = $imageOptimizer->store($image, 'announcements', 'public', 'images');

                    $uploadedPaths[] = $path;

                    $announcement->images()->create([
                        'image_path' => $path,
                    ]);
                }
            });
        } catch (\Throwable $exception) {
            foreach ($uploadedPaths as $path) {
                Storage::disk('public')->delete($path);
            }

            throw $exception;
        }

        foreach ($removedPaths as $path) {
            Storage::disk('public')->delete($path);
        }

        $activityLogService->log(
            $user,
            'Updated',
            'Announcement',
            "Updated announcement: {$validated['title']}"
        );

        $redirectView = match ($validated['announcement_status']) {
            'Scheduled' => 'schedule',
            'Draft' => 'drafts',
            default => 'announcements',
        };

        return to_route('admin.announcements.index', [
            'view' => $redirectView,
        ])->with('success', 'Announcement updated successfully.');
    }

    public function destroy(
        Announcement $announcement,
        ActivityLogService $activityLogService
    ): RedirectResponse {
        $title = $announcement->title;
        $user = request()->user();

        $imagePaths = $announcement->images()
            ->pluck('image_path')
            ->all();

        DB::transaction(function () use (
            $announcement,
            $activityLogService,
            $user,
            $title
        ): void {
            $activityLogService->log(
                $user,
                'Deleted',
                'Announcement',
                "Deleted announcement: {$title}"
            );

            $announcement->delete();
        });

        foreach ($imagePaths as $path) {
            Storage::disk('public')->delete($path);
        }

        return to_route('admin.announcements.index')
            ->with('success', 'Announcement deleted successfully.');
    }

    /**
     * Page size for the index. The published feed loads more as the admin
     * scrolls by asking for a larger ?limit= (always from the first item),
     * so its 5-second refresh returns the same, consistent list.
     */
    private function perPage(string $view): int
    {
        if ($view !== 'announcements') {
            return 10;
        }

        $limit = filter_var(request()->query('limit'), FILTER_VALIDATE_INT);

        return $limit === false ? 10 : max(10, min($limit, 200));
    }

    /**
     * Convert a submitted schedule to the app timezone before storing it.
     *
     * Edit forms send back the serialized value (UTC, e.g. "...Z"). Storing
     * it as-is would save the UTC wall-clock time and shift the schedule.
     */
    private function toAppTimezone(string $scheduledAt): string
    {
        return Carbon::parse($scheduledAt)
            ->setTimezone(config('app.timezone'))
            ->toDateTimeString();
    }
}
