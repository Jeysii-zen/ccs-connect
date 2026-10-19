<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\EventStatus;
use App\Enums\ProofStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\EventService;
use App\Services\RegistrationService;
use Illuminate\Contracts\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "Event Participation" (Faculty/Admin workflow): registered students and
 * their proof photos for one manageable event.
 */
class EventParticipantController extends Controller
{
    private const FILTERS = ['all', 'review', 'approved', 'rejected', 'missing'];

    private const ATTENDANCE_FILTERS = ['all', 'attended', 'pending', 'absent', 'incomplete'];

    public function __construct(
        private readonly EventService $eventService,
        private readonly RegistrationService $registrationService
    ) {}

    public function index(Request $request, Event $event): Response
    {
        Gate::authorize('view', $event);

        $filter = $request->query('proof', 'all');
        $filter = is_string($filter) && in_array($filter, self::FILTERS, true) ? $filter : 'all';

        $attendance = $request->query('attendance', 'all');
        $attendance = is_string($attendance) && in_array($attendance, self::ATTENDANCE_FILTERS, true) ? $attendance : 'all';

        // One clock for the filter and the badges, so they always agree.
        $now = now();

        $event->load(['location', 'creator:id,first_name,last_name'])
            ->loadCount([
                'registrations',
                'registrations as pending_review_count' => function (Builder $query): void {
                    $this->awaitingReview($query);
                },
            ]);

        $registrations = $event->registrations()
            ->with([
                'student:id,first_name,last_name,student_number',
                'proofReviewer:id,first_name,last_name',
                'attendanceModifier:id,first_name,last_name',
            ])
            ->when($filter === 'review', function (Builder $query): void {
                $this->awaitingReview($query);
            })
            ->when($filter === 'approved', function (Builder $query): void {
                $query->where('proof_status', ProofStatus::APPROVED->value);
            })
            ->when($filter === 'rejected', function (Builder $query): void {
                $query->where('proof_status', ProofStatus::REJECTED->value);
            })
            ->when($filter === 'missing', function (Builder $query): void {
                $query->where('proof_status', ProofStatus::PENDING->value)
                    ->whereNull('proof_photo_path');
            })
            ->when($attendance !== 'all', fn ($query) => $query->whereAttendance(
                $event,
                AttendanceStatus::from(strtoupper($attendance)),
                $now
            ))
            // Photos waiting for review first, oldest upload first.
            ->orderByRaw(
                'case when proof_status = ? and proof_photo_path is not null then 0 else 1 end',
                [ProofStatus::PENDING->value]
            )
            ->orderBy('proof_uploaded_at')
            ->orderBy('registered_at')
            ->orderBy('registration_id')
            ->paginate(20)
            ->withQueryString()
            ->through(fn (EventRegistration $registration) => $this->registrationService->toManagerArray(
                $registration,
                $event,
                $now
            ));

        return Inertia::render('Events/Manage/Participants', [
            'event' => $this->eventService->toManagementArray($event),
            'registrations' => $registrations,
            'currentFilter' => $filter,
            'currentAttendance' => $attendance,
            // Attendance can be changed by hand once the event starts;
            // archived events are final records.
            'canModifyAttendance' => ! $event->hasStatus(EventStatus::ARCHIVED)
                && $now->greaterThanOrEqualTo($event->startsAt()),
            'canReviewProof' => ! $event->hasStatus(EventStatus::ARCHIVED),
            'routePrefix' => $request->user()->role === 'admin' ? 'admin' : 'faculty',
        ]);
    }

    /**
     * Photos uploaded and not yet reviewed.
     */
    private function awaitingReview(Builder $query): void
    {
        $query->where('proof_status', ProofStatus::PENDING->value)
            ->whereNotNull('proof_photo_path');
    }
}
