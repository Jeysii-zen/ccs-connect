<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\EventStatus;
use App\Enums\ProofStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Student event registration (DFD 4.x): "Validation checks event status,
 * deadline, capacity, and duplicate registration. Current User year/block
 * is snapshotted into EventRegistration." Registrations cannot be
 * cancelled (questionnaire Q25).
 */
class RegistrationService
{
    private const DATETIME_FORMAT = 'Y-m-d\TH:i';

    public function register(Event $event, User $student): EventRegistration
    {
        if (blank($student->year_level) || blank($student->block_number)) {
            throw ValidationException::withMessages([
                'registration' => 'Your account has no year level or block yet. Ask the CCS administrator to update your account before registering.',
            ]);
        }

        try {
            return DB::transaction(function () use ($event, $student): EventRegistration {
                // Serializes registrations per event, so two students cannot
                // both take the last seat.
                $locked = Event::query()
                    ->whereKey($event->event_id)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($locked->registrations()->where('user_id', $student->id)->exists()) {
                    throw $this->alreadyRegistered();
                }

                $phase = $locked->lifecycleStatus($locked->registrations()->count());

                if ($phase !== 'Open') {
                    throw ValidationException::withMessages([
                        'registration' => match ($phase) {
                            'Full' => 'This event is full.',
                            'Closed', 'Ongoing', 'Completed' => 'Registration for this event has closed.',
                            default => 'This event is not open for registration.',
                        },
                    ]);
                }

                return EventRegistration::create([
                    'event_id' => $locked->event_id,
                    'user_id' => $student->id,
                    'year_level_at_registration' => $student->year_level,
                    'block_at_registration' => $student->block_number,
                    'registered_at' => now(),
                    'proof_status' => $locked->proof_photo_required
                        ? ProofStatus::PENDING->value
                        : ProofStatus::NOT_REQUIRED->value,
                    'attendance_status' => AttendanceStatus::PENDING->value,
                ]);
            });
        } catch (UniqueConstraintViolationException) {
            // A parallel request registered the same student first.
            throw $this->alreadyRegistered();
        }
    }

    /**
     * What the viewer can do on the event page: registered, available,
     * full, closed, guest or not_student.
     */
    public function availability(Event $event, ?User $viewer, ?EventRegistration $registration, int $registeredCount): string
    {
        if ($registration) {
            return 'registered';
        }

        if (! $viewer) {
            return 'guest';
        }

        if ($viewer->role !== 'student') {
            return 'not_student';
        }

        return match ($event->lifecycleStatus($registeredCount)) {
            'Open' => 'available',
            'Full' => 'full',
            default => 'closed',
        };
    }

    /**
     * The student's own view of their registration and proof.
     *
     * @return array<string, mixed>
     */
    public function toStudentArray(EventRegistration $registration, Event $event): array
    {
        $proofStatus = $registration->effectiveProofStatus($event);
        $window = $event->proofWindowState();

        return [
            'registration_id' => $registration->registration_id,
            'registered_at' => $registration->registered_at->format(self::DATETIME_FORMAT),
            'year_level' => $registration->year_level_at_registration,
            'block' => $registration->block_at_registration,
            'proof_status' => $proofStatus,
            'has_proof_photo' => $registration->proof_photo_path !== null,
            'proof_uploaded_at' => $registration->proof_uploaded_at?->format(self::DATETIME_FORMAT),
            'proof_rejection_reason' => $registration->proof_rejection_reason,
            'proof_url' => $registration->proof_photo_path
                ? route('registrations.proof.show', $registration)
                : null,
            'proof_window' => $window,
            'attendance_status' => $registration->effectiveAttendanceStatus($event),
            'checked_in_at' => $registration->qr_checked_in_at?->format(self::DATETIME_FORMAT),
            'can_upload_proof' => $window === 'open'
                && $event->hasStatus(EventStatus::PUBLISHED)
                && in_array($registration->proof_status, [
                    ProofStatus::PENDING->value,
                    ProofStatus::REJECTED->value,
                ], true),
        ];
    }

    /**
     * A manager's view of a participant (Faculty/Admin workflow: "Event
     * Participation").
     *
     * @return array<string, mixed>
     */
    public function toManagerArray(EventRegistration $registration, Event $event, ?Carbon $now = null): array
    {
        $student = $registration->student;
        $reviewer = $registration->proofReviewer;
        $modifier = $registration->attendanceModifier;

        return [
            'registration_id' => $registration->registration_id,
            'student' => [
                'name' => trim("{$student->first_name} {$student->last_name}"),
                'student_number' => $student->student_number,
            ],
            'year_level' => $registration->year_level_at_registration,
            'block' => $registration->block_at_registration,
            'registered_at' => $registration->registered_at->format(self::DATETIME_FORMAT),
            'proof_status' => $registration->effectiveProofStatus($event),
            'awaiting_review' => $registration->isAwaitingReview(),
            'proof_uploaded_at' => $registration->proof_uploaded_at?->format(self::DATETIME_FORMAT),
            // Sent back with a review so a photo replaced in the meantime
            // is never approved unseen.
            'proof_version' => $registration->proof_uploaded_at?->format('Y-m-d H:i:s'),
            'proof_url' => $registration->proof_photo_path
                ? route('registrations.proof.show', $registration)
                : null,
            'proof_rejection_reason' => $registration->proof_rejection_reason,
            'proof_reviewed_at' => $registration->proof_reviewed_at?->format(self::DATETIME_FORMAT),
            'proof_reviewer' => $reviewer
                ? trim("{$reviewer->first_name} {$reviewer->last_name}")
                : null,
            'attendance_status' => $registration->effectiveAttendanceStatus($event, $now),
            'checked_in_at' => $registration->qr_checked_in_at?->format(self::DATETIME_FORMAT),
            'attendance_modified_at' => $registration->attendance_modified_at?->format(self::DATETIME_FORMAT),
            // Sent back with a change or reset so a stale page never
            // overwrites a newer change; null while automatic.
            'attendance_version' => $registration->attendance_modified_at?->format('Y-m-d H:i:s'),
            'attendance_modifier' => $modifier
                ? trim("{$modifier->first_name} {$modifier->last_name}")
                : null,
        ];
    }

    private function alreadyRegistered(): ValidationException
    {
        return ValidationException::withMessages([
            'registration' => 'You are already registered for this event.',
        ]);
    }
}
