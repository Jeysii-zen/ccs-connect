<?php

namespace App\Models;

use App\Enums\AttendanceStatus;
use App\Enums\ProofStatus;
use Database\Factories\EventRegistrationFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $registration_id
 * @property int $event_id
 * @property int $user_id
 * @property string $year_level_at_registration
 * @property string $block_at_registration
 * @property Carbon $registered_at
 * @property string $proof_status
 * @property string|null $proof_photo_path
 * @property Carbon|null $proof_uploaded_at
 * @property int|null $proof_reviewed_by_user_id
 * @property Carbon|null $proof_reviewed_at
 * @property string|null $proof_rejection_reason
 * @property Carbon|null $qr_checked_in_at
 * @property string $attendance_status
 * @property Carbon|null $attended_at
 * @property int|null $attendance_modified_by_user_id
 * @property Carbon|null $attendance_modified_at
 */
class EventRegistration extends Model
{
    /** @use HasFactory<EventRegistrationFactory> */
    use HasFactory;

    protected $primaryKey = 'registration_id';

    public $timestamps = false;

    protected $fillable = [
        'event_id',
        'user_id',
        'year_level_at_registration',
        'block_at_registration',
        'registered_at',
        'proof_status',
        'proof_photo_path',
        'proof_uploaded_at',
        'proof_reviewed_by_user_id',
        'proof_reviewed_at',
        'proof_rejection_reason',
        'qr_checked_in_at',
        'attendance_status',
        'attended_at',
        'attendance_modified_by_user_id',
        'attendance_modified_at',
    ];

    protected function casts(): array
    {
        return [
            'registered_at' => 'datetime',
            'proof_uploaded_at' => 'datetime',
            'proof_reviewed_at' => 'datetime',
            'qr_checked_in_at' => 'datetime',
            'attended_at' => 'datetime',
            'attendance_modified_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Event, $this>
     */
    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class, 'event_id', 'event_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function proofReviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'proof_reviewed_by_user_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function attendanceModifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'attendance_modified_by_user_id');
    }

    public function isOwnedBy(User $user): bool
    {
        return $this->user_id === $user->id;
    }

    public function hasProofStatus(ProofStatus $status): bool
    {
        return $this->proof_status === $status->value;
    }

    /**
     * A photo was uploaded and is waiting for a reviewer.
     */
    public function isAwaitingReview(): bool
    {
        return $this->hasProofStatus(ProofStatus::PENDING)
            && $this->proof_photo_path !== null;
    }

    /**
     * The stored status, or EXPIRED once the event's upload window has
     * closed without a photo waiting for review or an approved one.
     * Uploaded photos stay reviewable after the window closes.
     */
    public function effectiveProofStatus(Event $event): string
    {
        $unresolved = ($this->hasProofStatus(ProofStatus::PENDING) && $this->proof_photo_path === null)
            || $this->hasProofStatus(ProofStatus::REJECTED);

        if (
            $unresolved
            && $event->proof_upload_end_at !== null
            && now()->greaterThan($event->proof_upload_end_at)
        ) {
            return ProofStatus::EXPIRED->value;
        }

        return $this->proof_status;
    }

    /**
     * Attendance (DFD 5.6), derived so it never goes stale: ATTENDED = QR
     * check-in + approved proof when required; ABSENT = no check-in by the
     * end; INCOMPLETE = checked in but the required proof can no longer be
     * completed. A manual change by Faculty/Admin (Q33) overrides it.
     *
     * scopeWhereAttendance() is the SQL form of these rules; change both
     * together (AttendanceFilterTest checks every combination).
     */
    public function effectiveAttendanceStatus(Event $event, ?Carbon $now = null): string
    {
        if ($this->attendance_modified_at !== null) {
            return $this->attendance_status;
        }

        $now ??= now();
        $proofDone = ! $event->proof_photo_required || $this->hasProofStatus(ProofStatus::APPROVED);

        return match (true) {
            $this->qr_checked_in_at !== null && $proofDone => AttendanceStatus::ATTENDED->value,
            $now->lessThan($event->endsAt()) => AttendanceStatus::PENDING->value,
            $this->qr_checked_in_at === null => AttendanceStatus::ABSENT->value,
            // The photo can still be uploaded or is waiting for a reviewer.
            $event->proofWindowState($now) !== 'closed' || $this->isAwaitingReview() => AttendanceStatus::PENDING->value,
            default => AttendanceStatus::INCOMPLETE->value,
        };
    }

    /**
     * Registrations of $event whose effectiveAttendanceStatus() at $now is
     * $status. The event-level facts are computed here in PHP, so the SQL
     * only tests row columns, and only with null-safe conditions.
     *
     * @param  Builder<EventRegistration>  $query
     * @return Builder<EventRegistration>
     */
    public function scopeWhereAttendance(Builder $query, Event $event, AttendanceStatus $status, Carbon $now): Builder
    {
        $ended = $now->greaterThanOrEqualTo($event->endsAt());
        $windowOpen = $event->proofWindowState($now) !== 'closed';
        $proofRequired = $event->proof_photo_required;

        // Not ATTENDED by the automatic rule.
        $notAttended = fn (Builder $q) => $q->where(fn (Builder $q) => $q
            ->whereNull('qr_checked_in_at')
            ->when($proofRequired, fn (Builder $q) => $q->orWhere('proof_status', '!=', ProofStatus::APPROVED->value)));

        $automatic = match ($status) {
            AttendanceStatus::ATTENDED => fn (Builder $q) => $q
                ->whereNotNull('qr_checked_in_at')
                ->when($proofRequired, fn (Builder $q) => $q->where('proof_status', ProofStatus::APPROVED->value)),
            AttendanceStatus::PENDING => $ended
                ? fn (Builder $q) => $notAttended($q)
                    ->whereNotNull('qr_checked_in_at')
                    ->unless($windowOpen, fn (Builder $q) => $q
                        ->where('proof_status', ProofStatus::PENDING->value)
                        ->whereNotNull('proof_photo_path'))
                : $notAttended,
            AttendanceStatus::ABSENT => $ended
                ? fn (Builder $q) => $q->whereNull('qr_checked_in_at')
                : fn (Builder $q) => $q->whereRaw('1 = 0'),
            AttendanceStatus::INCOMPLETE => $ended && ! $windowOpen
                ? fn (Builder $q) => $notAttended($q)
                    ->whereNotNull('qr_checked_in_at')
                    ->where(fn (Builder $q) => $q
                        ->where('proof_status', '!=', ProofStatus::PENDING->value)
                        ->orWhereNull('proof_photo_path'))
                : fn (Builder $q) => $q->whereRaw('1 = 0'),
        };

        return $query->where(fn (Builder $q) => $q
            ->where(fn (Builder $q) => $q
                ->whereNotNull('attendance_modified_at')
                ->where('attendance_status', $status->value))
            ->orWhere(fn (Builder $q) => $automatic($q->whereNull('attendance_modified_at'))));
    }
}
