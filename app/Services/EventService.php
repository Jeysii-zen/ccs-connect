<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Event management (DFD 3.1–3.4): create, edit, publish, archive, delete.
 *
 * Ownership is checked by EventPolicy before these run; this service owns
 * the lifecycle rules and keeps poster files consistent with the database.
 */
class EventService
{
    private const POSTER_DIRECTORY = 'events';

    private const DATETIME_FORMAT = 'Y-m-d\TH:i';

    public function __construct(
        private readonly ActivityLogService $activityLogService,
        private readonly ProofService $proofService,
        private readonly ImageOptimizer $imageOptimizer
    ) {}

    /**
     * @param  array<string, mixed>  $data  validated StoreEventRequest data
     */
    public function create(User $user, array $data, UploadedFile $poster): Event
    {
        $posterPath = $this->storePoster($poster);

        try {
            return DB::transaction(function () use ($user, $data, $posterPath): Event {
                $event = Event::create([
                    ...$this->attributes($data),
                    'created_by_user_id' => $user->id,
                    'poster_path' => $posterPath,
                    'event_status' => $data['event_status'] ?? EventStatus::DRAFT->value,
                ]);

                $this->activityLogService->log(
                    $user,
                    'Created',
                    'Event',
                    "Created event: {$event->title}"
                );

                return $event;
            });
        } catch (\Throwable $exception) {
            Storage::disk('public')->delete($posterPath);

            throw $exception;
        }
    }

    /**
     * @param  array<string, mixed>  $data  validated UpdateEventRequest data
     */
    public function update(Event $event, User $user, array $data, ?UploadedFile $poster): Event
    {
        $this->ensureEditable($event);

        $oldPosterPath = $event->poster_path;
        $newPosterPath = $poster ? $this->storePoster($poster) : null;

        try {
            DB::transaction(function () use ($event, $user, $data, $newPosterPath): void {
                $event->update([
                    ...$this->attributes($data),
                    ...($newPosterPath ? ['poster_path' => $newPosterPath] : []),
                ]);

                $this->activityLogService->log(
                    $user,
                    'Updated',
                    'Event',
                    "Updated event: {$event->title}"
                );
            });
        } catch (\Throwable $exception) {
            if ($newPosterPath) {
                Storage::disk('public')->delete($newPosterPath);
            }

            throw $exception;
        }

        // The replaced poster is removed only once nothing references it.
        if ($newPosterPath && $oldPosterPath !== $newPosterPath) {
            $this->deletePosterIfUnused($oldPosterPath);
        }

        return $event;
    }

    public function publish(Event $event, User $user): void
    {
        if (! $event->hasStatus(EventStatus::DRAFT)) {
            throw ValidationException::withMessages([
                'event' => 'Only draft events can be published.',
            ]);
        }

        $this->transition($event, $user, EventStatus::PUBLISHED, 'Published');
    }

    /**
     * Archiving keeps the event and its registration history (DFD 3.3).
     */
    public function archive(Event $event, User $user): void
    {
        if (! $event->hasStatus(EventStatus::PUBLISHED)) {
            throw ValidationException::withMessages([
                'event' => 'Only published events can be archived.',
            ]);
        }

        $this->transition($event, $user, EventStatus::ARCHIVED, 'Archived');
    }

    /**
     * Deleting is allowed in any state (questionnaire Q41) and removes the
     * event's registrations with it (Q42, via the registration foreign key).
     */
    public function delete(Event $event, User $user): void
    {
        $title = $event->title;
        $posterPath = $event->poster_path;

        /** @var list<string> $proofPaths */
        $proofPaths = $event->registrations()
            ->whereNotNull('proof_photo_path')
            ->pluck('proof_photo_path')
            ->all();

        DB::transaction(function () use ($event, $user, $title): void {
            $event->delete();

            $this->activityLogService->log(
                $user,
                'Deleted',
                'Event',
                "Deleted event: {$title}"
            );
        });

        $this->deletePosterIfUnused($posterPath);

        // The registrations went with the event (cascade); remove their
        // private proof photos too.
        $this->proofService->deletePhotos($proofPaths);
    }

    /**
     * Registered students: the withCount('registrations') value when the
     * query loaded it, otherwise a fresh count.
     */
    public function registeredCount(Event $event): int
    {
        $count = $event->getAttribute('registrations_count');

        return is_numeric($count) ? (int) $count : $event->registrations()->count();
    }

    /**
     * Lifecycle actions allowed in the event's current state. Ownership is
     * enforced separately by EventPolicy.
     *
     * @return array{edit: bool, publish: bool, archive: bool, delete: bool}
     */
    public function availableActions(Event $event): array
    {
        return [
            'edit' => ! $event->hasStatus(EventStatus::ARCHIVED),
            'publish' => $event->hasStatus(EventStatus::DRAFT),
            'archive' => $event->hasStatus(EventStatus::PUBLISHED),
            'delete' => true,
        ];
    }

    /**
     * Management payload. Dates are local wall-clock strings matching the
     * form inputs, so the browser never shifts them by timezone.
     *
     * @return array<string, mixed>
     */
    public function toManagementArray(Event $event): array
    {
        return [
            ...$this->toPublicArray($event),
            'location_id' => $event->location_id,
            'event_status' => $event->event_status,
            'creator' => [
                'id' => $event->created_by_user_id,
                'name' => trim(
                    ($event->creator->first_name ?? '').' '.($event->creator->last_name ?? '')
                ),
            ],
            'actions' => $this->availableActions($event),
            'pending_review_count' => (int) $event->getAttribute('pending_review_count'),
            'updated_at' => $event->updated_at->toIso8601String(),
        ];
    }

    /**
     * Fields shown to anyone who may see a published event (User Workflow:
     * "DISPLAY: Event Details").
     *
     * @return array<string, mixed>
     */
    public function toPublicArray(Event $event): array
    {
        $registeredCount = $this->registeredCount($event);

        return [
            'event_id' => $event->event_id,
            'title' => $event->title,
            'description' => $event->description,
            'event_date' => $event->event_date->toDateString(),
            'start_time' => substr($event->start_time, 0, 5),
            'end_time' => substr($event->end_time, 0, 5),
            'location' => $event->location?->only([
                'location_id',
                'location_name',
                'description',
                'building',
                'floor',
                'room_number',
            ]),
            'target_participants' => $event->target_participants,
            'max_participants' => $event->max_participants,
            'registered_count' => $registeredCount,
            'registration_deadline' => $event->registration_deadline->format(self::DATETIME_FORMAT),
            'poster_url' => '/storage/'.ltrim($event->poster_path, '/'),
            'proof_photo_required' => $event->proof_photo_required,
            'proof_upload_start_at' => $event->proof_upload_start_at?->format(self::DATETIME_FORMAT),
            'proof_upload_end_at' => $event->proof_upload_end_at?->format(self::DATETIME_FORMAT),
            'proof_window' => $event->proofWindowState(),
            'lifecycle_status' => $event->lifecycleStatus($registeredCount),
        ];
    }

    private function ensureEditable(Event $event): void
    {
        if ($event->hasStatus(EventStatus::ARCHIVED)) {
            throw ValidationException::withMessages([
                'event' => 'Archived events can no longer be edited.',
            ]);
        }
    }

    private function transition(Event $event, User $user, EventStatus $status, string $action): void
    {
        DB::transaction(function () use ($event, $user, $status, $action): void {
            $event->update(['event_status' => $status->value]);

            $this->activityLogService->log(
                $user,
                $action,
                'Event',
                "{$action} event: {$event->title}"
            );
        });
    }

    /**
     * Maps validated input to columns. The creator, poster and status are
     * set explicitly by the caller, never from request data.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function attributes(array $data): array
    {
        $proofRequired = (bool) $data['proof_photo_required'];

        return [
            'title' => $data['title'],
            'description' => $data['description'],
            'event_date' => $data['event_date'],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
            'location_id' => $data['location_id'],
            'target_participants' => $data['target_participants'],
            'max_participants' => $data['max_participants'],
            'registration_deadline' => $data['registration_deadline'],
            'proof_photo_required' => $proofRequired,
            'proof_upload_start_at' => $proofRequired ? $data['proof_upload_start_at'] : null,
            'proof_upload_end_at' => $proofRequired ? $data['proof_upload_end_at'] : null,
        ];
    }

    private function storePoster(UploadedFile $poster): string
    {
        return $this->imageOptimizer->store($poster, self::POSTER_DIRECTORY, 'public', 'poster');
    }

    private function deletePosterIfUnused(string $path): void
    {
        if (! Event::query()->where('poster_path', $path)->exists()) {
            Storage::disk('public')->delete($path);
        }
    }
}
