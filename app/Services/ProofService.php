<?php

namespace App\Services;

use App\Enums\EventStatus;
use App\Enums\ProofStatus;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * Proof photos (DFD 5.1–5.4, SSD3-B): upload within the event's window,
 * review by the event's managers, re-upload after a rejection.
 *
 * Photos are private: they live on the "local" disk (storage/app/private)
 * and are only served through ProofController after authorization.
 */
class ProofService
{
    private const DISK = 'local';

    public function __construct(
        private readonly ImageOptimizer $imageOptimizer
    ) {}

    private const DISPLAY_FORMAT = 'M j, Y g:i A';

    /**
     * Upload or re-upload. Allowed while the proof is PENDING (first upload,
     * or replacing a photo not yet reviewed) or REJECTED; an approved photo
     * is final.
     */
    public function submit(EventRegistration $registration, UploadedFile $photo): void
    {
        $event = $registration->event;

        if (! $event->proof_photo_required) {
            throw $this->error('This event does not require a proof photo.');
        }

        if (! $event->hasStatus(EventStatus::PUBLISHED)) {
            throw $this->error('This event no longer accepts proof photos.');
        }

        match ($event->proofWindowState()) {
            'upcoming' => throw $this->error(
                'Proof uploads open on '.$event->proof_upload_start_at?->format(self::DISPLAY_FORMAT).'.'
            ),
            'closed' => throw $this->error(
                'The proof upload window closed on '.$event->proof_upload_end_at?->format(self::DISPLAY_FORMAT).'.'
            ),
            default => null,
        };

        $this->ensureReplaceable($registration);

        $oldPath = $registration->proof_photo_path;
        $newPath = $this->imageOptimizer->store($photo, "proofs/{$event->event_id}", self::DISK, 'photo');

        try {
            DB::transaction(function () use ($registration, $newPath): void {
                // Re-check under a lock: a reviewer may have approved it
                // between the check above and this write.
                $locked = EventRegistration::query()
                    ->whereKey($registration->registration_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                $this->ensureReplaceable($locked);

                $locked->update([
                    'proof_status' => ProofStatus::PENDING->value,
                    'proof_photo_path' => $newPath,
                    'proof_uploaded_at' => now(),
                    'proof_reviewed_by_user_id' => null,
                    'proof_reviewed_at' => null,
                    'proof_rejection_reason' => null,
                ]);
            });
        } catch (\Throwable $exception) {
            Storage::disk(self::DISK)->delete($newPath);

            throw $exception;
        }

        // Questionnaire Q38: the replaced photo is not kept.
        if ($oldPath && $oldPath !== $newPath) {
            Storage::disk(self::DISK)->delete($oldPath);
        }

        $registration->refresh();
    }

    /**
     * @param  string  $reviewedVersion  proof_uploaded_at of the photo the
     *                                   reviewer looked at (Y-m-d H:i:s)
     */
    public function approve(EventRegistration $registration, User $reviewer, string $reviewedVersion): void
    {
        $this->review($registration, $reviewer, $reviewedVersion, ProofStatus::APPROVED, null);
    }

    public function reject(EventRegistration $registration, User $reviewer, string $reviewedVersion, string $reason): void
    {
        $this->review($registration, $reviewer, $reviewedVersion, ProofStatus::REJECTED, $reason);
    }

    /**
     * Delete the photos of registrations that are being removed (e.g. when
     * their event is deleted). Call after the database delete succeeds.
     *
     * @param  list<string>  $paths
     */
    public function deletePhotos(array $paths): void
    {
        if ($paths !== []) {
            Storage::disk(self::DISK)->delete($paths);
        }
    }

    private function review(
        EventRegistration $registration,
        User $reviewer,
        string $reviewedVersion,
        ProofStatus $decision,
        ?string $reason
    ): void {
        // Archived events are kept as final records.
        if ($registration->event->hasStatus(EventStatus::ARCHIVED)) {
            throw $this->error('This event is archived, so its proof photos can no longer be reviewed.');
        }

        // Single conditional update: only a photo that is still awaiting
        // review, and is the one the reviewer saw, changes state.
        $updated = EventRegistration::query()
            ->whereKey($registration->registration_id)
            ->where('proof_status', ProofStatus::PENDING->value)
            ->whereNotNull('proof_photo_path')
            ->where('proof_uploaded_at', $reviewedVersion)
            ->update([
                'proof_status' => $decision->value,
                'proof_reviewed_by_user_id' => $reviewer->id,
                'proof_reviewed_at' => now(),
                'proof_rejection_reason' => $reason,
            ]);

        if ($updated === 0) {
            $registration->refresh();

            throw $this->error(
                $registration->isAwaitingReview()
                    ? 'The student uploaded a new photo. Review the new photo instead.'
                    : 'This proof is no longer awaiting review.'
            );
        }

        $registration->refresh();
    }

    private function ensureReplaceable(EventRegistration $registration): void
    {
        if ($registration->hasProofStatus(ProofStatus::APPROVED)) {
            throw $this->error('Your proof photo has already been approved.');
        }

        if (! $registration->hasProofStatus(ProofStatus::PENDING)
            && ! $registration->hasProofStatus(ProofStatus::REJECTED)) {
            throw $this->error('A proof photo cannot be uploaded for this registration.');
        }
    }

    private function error(string $message): ValidationException
    {
        return ValidationException::withMessages(['proof' => $message]);
    }
}
