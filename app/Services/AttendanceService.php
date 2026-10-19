<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * QR check-in and attendance (DFD 5.5–5.6, SSD3-C).
 *
 * The event's managers show a QR code that changes every CODE_PERIOD
 * seconds; registered students scan it with their phone camera while the
 * event is ongoing. Codes are an HMAC of the event and the time slice, so
 * nothing is stored and a forwarded code stops working within 15–30s.
 */
class AttendanceService
{
    // The QR screen polls every 5s (Manage/CheckIn.jsx), well inside this.
    private const CODE_PERIOD = 15;

    public function isCheckInOpen(Event $event): bool
    {
        $now = now();

        return $event->hasStatus(EventStatus::PUBLISHED)
            && $now->greaterThanOrEqualTo($event->startsAt())
            && $now->lessThan($event->endsAt());
    }

    public function currentCode(Event $event): string
    {
        return $this->codeFor($event, $this->slice());
    }

    /**
     * The current code, or the previous one so a code scanned just before
     * it rotates still works.
     */
    public function isValidCode(Event $event, string $code): bool
    {
        $slice = $this->slice();

        return hash_equals($this->codeFor($event, $slice), $code)
            || hash_equals($this->codeFor($event, $slice - 1), $code);
    }

    public function checkInUrl(Event $event): string
    {
        return route('student.check-in.show', [$event, 'code' => $this->currentCode($event)]);
    }

    public function qrSvg(Event $event): string
    {
        $svg = (new Writer(new ImageRenderer(new RendererStyle(320, 1), new SvgImageBackEnd)))
            ->writeString($this->checkInUrl($event));

        // Drop the XML declaration so the SVG can be inlined.
        return trim(substr($svg, (int) strpos($svg, "\n") + 1));
    }

    /**
     * @return bool true when checked in now, false when already checked in
     */
    public function checkIn(Event $event, User $student, string $code): bool
    {
        $registration = $event->registrations()->where('user_id', $student->id)->first();

        if (! $registration) {
            throw $this->error('You are not registered for this event.');
        }

        if ($registration->qr_checked_in_at !== null) {
            return false;
        }

        if (! $this->isCheckInOpen($event)) {
            throw $this->error('Check-in is only open while the event is ongoing.');
        }

        if (! $this->isValidCode($event, $code)) {
            throw $this->error('This QR code has expired. Scan the code on the screen again.');
        }

        // Conditional update: a repeated or parallel scan is a no-op.
        return EventRegistration::query()
            ->whereKey($registration->registration_id)
            ->whereNull('qr_checked_in_at')
            ->update(['qr_checked_in_at' => now()]) === 1;
    }

    /**
     * Manual change by the event's managers (Q33); overrides the derived
     * status from then on.
     *
     * @param  string|null  $seenVersion  attendance_modified_at the manager
     *                                    saw (Y-m-d H:i:s), null if automatic
     */
    public function modify(EventRegistration $registration, User $manager, AttendanceStatus $status, ?string $seenVersion): void
    {
        $this->ensureNotArchived($registration->event);

        if (now()->lessThan($registration->event->startsAt())) {
            throw $this->error('Attendance can be changed once the event starts.');
        }

        $this->updateIfUnchanged($registration, $seenVersion, [
            'attendance_status' => $status->value,
            // Manual changes only; reports must read attendance through
            // effectiveAttendanceStatus() / scopeWhereAttendance().
            'attended_at' => $status === AttendanceStatus::ATTENDED ? now() : null,
            'attendance_modified_by_user_id' => $manager->id,
            'attendance_modified_at' => now(),
        ]);
    }

    /**
     * Drop the manual change so the status is derived again from the QR
     * check-in and proof photo, which are left untouched.
     */
    public function resetToAutomatic(EventRegistration $registration, string $seenVersion): void
    {
        $this->ensureNotArchived($registration->event);

        if ($registration->attendance_modified_at === null) {
            throw $this->error('Attendance is already set automatically.');
        }

        $this->updateIfUnchanged($registration, $seenVersion, [
            'attendance_status' => AttendanceStatus::PENDING->value,
            'attended_at' => null,
            'attendance_modified_by_user_id' => null,
            'attendance_modified_at' => null,
        ]);
    }

    /**
     * Applies $values only if the attendance is still what the manager saw,
     * so a stale page never overwrites someone else's newer change.
     *
     * shortcut: the version has one-second precision, so two changes to one
     * row within the same second look identical; add a counter column if
     * that ever matters.
     *
     * @param  array<string, mixed>  $values
     */
    private function updateIfUnchanged(EventRegistration $registration, ?string $seenVersion, array $values): void
    {
        DB::transaction(function () use ($registration, $seenVersion, $values): void {
            $locked = EventRegistration::query()
                ->whereKey($registration->registration_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($locked->attendance_modified_at?->format('Y-m-d H:i:s') !== $seenVersion) {
                throw $this->error('Attendance was changed by someone else. Refresh the page and try again.');
            }

            $locked->update($values);
        });
    }

    /**
     * Archived events are kept as final records.
     */
    private function ensureNotArchived(Event $event): void
    {
        if ($event->hasStatus(EventStatus::ARCHIVED)) {
            throw $this->error('This event is archived, so its attendance can no longer be changed.');
        }
    }

    private function slice(): int
    {
        return intdiv(now()->getTimestamp(), self::CODE_PERIOD);
    }

    private function codeFor(Event $event, int $slice): string
    {
        return substr(
            hash_hmac('sha256', "event-check-in|{$event->event_id}|{$slice}", (string) config('app.key')),
            0,
            20
        );
    }

    private function error(string $message): ValidationException
    {
        return ValidationException::withMessages(['attendance' => $message]);
    }
}
