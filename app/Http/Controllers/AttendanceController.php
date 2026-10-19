<?php

namespace App\Http\Controllers;

use App\Enums\AttendanceStatus;
use App\Enums\EventStatus;
use App\Http\Requests\Attendance\ResetAttendanceRequest;
use App\Http\Requests\Attendance\UpdateAttendanceRequest;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\AttendanceService;
use App\Services\EventService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * QR check-in (SSD3-C) and attendance changes (Q33). The student checking
 * in is always the signed-in user; no identity is read from the request.
 */
class AttendanceController extends Controller
{
    public function __construct(
        private readonly AttendanceService $attendanceService,
        private readonly EventService $eventService
    ) {}

    /**
     * The rotating QR code the event's managers show on screen.
     */
    public function display(Request $request, Event $event): Response
    {
        Gate::authorize('view', $event);

        $open = $this->attendanceService->isCheckInOpen($event);

        // Closures: the page polls only the live props, so the event
        // details are built on the first load only.
        return Inertia::render('Events/Manage/CheckIn', [
            'event' => fn () => $this->eventService->toManagementArray(
                $event->load(['location', 'creator:id,first_name,last_name'])->loadCount('registrations')
            ),
            'lifecycleStatus' => fn () => $event->lifecycleStatus($event->registrations()->count()),
            'checkInOpen' => $open,
            'qrSvg' => fn () => $open ? $this->attendanceService->qrSvg($event) : null,
            'checkedInCount' => fn () => $event->registrations()->whereNotNull('qr_checked_in_at')->count(),
            // Names only, for a roll call; no student numbers on a projector.
            'recentCheckIns' => fn () => $event->registrations()
                ->whereNotNull('qr_checked_in_at')
                ->with('student:id,first_name,last_name')
                ->latest('qr_checked_in_at')
                ->latest('registration_id')
                ->limit(10)
                ->get()
                ->map(fn (EventRegistration $registration) => [
                    'registration_id' => $registration->registration_id,
                    'name' => trim("{$registration->student->first_name} {$registration->student->last_name}"),
                    'checked_in_at' => $registration->qr_checked_in_at?->format('H:i'),
                ]),
            'routePrefix' => fn () => $request->user()->role === 'admin' ? 'admin' : 'faculty',
        ]);
    }

    /**
     * Where the QR code leads: the student confirms the check-in, so a
     * GET request never changes data.
     */
    public function show(Request $request, Event $event): Response
    {
        abort_unless($event->hasStatus(EventStatus::PUBLISHED), 404);

        $registration = $event->registrations()->where('user_id', $request->user()->id)->first();

        return Inertia::render('Events/CheckIn', [
            'event' => $this->eventService->toPublicArray($event->load('location')->loadCount('registrations')),
            'code' => mb_substr($this->code($request), 0, 64),
            'registered' => $registration !== null,
            'checkInOpen' => $this->attendanceService->isCheckInOpen($event),
            'checkedInAt' => $registration?->qr_checked_in_at?->format('Y-m-d\TH:i'),
        ]);
    }

    public function store(Request $request, Event $event): RedirectResponse
    {
        abort_unless($event->hasStatus(EventStatus::PUBLISHED), 404);

        $checkedIn = $this->attendanceService->checkIn(
            $event,
            $request->user(),
            $this->code($request)
        );

        return to_route('student.registrations.index')->with(
            'success',
            $checkedIn ? "You are checked in to {$event->title}." : "You are already checked in to {$event->title}."
        );
    }

    /**
     * {registration} is scoped to {event}, so a registration from another
     * event cannot be changed through this URL.
     */
    public function update(UpdateAttendanceRequest $request, Event $event, EventRegistration $registration): RedirectResponse
    {
        $this->attendanceService->modify(
            $registration,
            $request->user(),
            AttendanceStatus::from($request->string('attendance_status')->toString()),
            $request->filled('attendance_version') ? $request->string('attendance_version')->toString() : null
        );

        return back()->with('success', 'Attendance updated.');
    }

    public function destroy(ResetAttendanceRequest $request, Event $event, EventRegistration $registration): RedirectResponse
    {
        $this->attendanceService->resetToAutomatic(
            $registration,
            $request->string('attendance_version')->toString()
        );

        return back()->with('success', 'Attendance reset to automatic.');
    }

    /**
     * The scanned code; anything that is not a string is treated as no
     * code, which AttendanceService rejects as expired.
     */
    private function code(Request $request): string
    {
        $code = $request->input('code');

        return is_string($code) ? $code : '';
    }
}
