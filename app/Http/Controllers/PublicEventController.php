<?php

namespace App\Http\Controllers;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Services\EventService;
use App\Services\RegistrationService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * "View Published Events" (SSD2-B) for guests and signed-in users.
 * Drafts and archived events are never returned here.
 */
class PublicEventController extends Controller
{
    public function __construct(
        private readonly EventService $eventService,
        private readonly RegistrationService $registrationService
    ) {}

    public function index(): Response
    {
        $events = Event::query()
            ->published()
            ->whereDate('event_date', '>=', today())
            ->with('location')
            ->withCount('registrations')
            ->orderBy('event_date')
            ->orderBy('start_time')
            ->orderBy('event_id')
            ->paginate(9)
            ->withQueryString()
            ->through(fn (Event $event) => $this->eventService->toPublicArray($event));

        return Inertia::render('Events/Index', [
            'events' => $events,
        ]);
    }

    public function show(Request $request, Event $event): Response
    {
        abort_unless($event->hasStatus(EventStatus::PUBLISHED), 404);

        $event->load('location')->loadCount('registrations');

        $viewer = $request->user();

        // Only a student's own registration is ever loaded here.
        $registration = $viewer?->role === 'student'
            ? $event->registrations()->where('user_id', $viewer->id)->first()
            : null;

        return Inertia::render('Events/Show', [
            'event' => $this->eventService->toPublicArray($event),
            'registrationState' => $this->registrationService->availability(
                $event,
                $viewer,
                $registration,
                $this->eventService->registeredCount($event)
            ),
            'registration' => $registration
                ? $this->registrationService->toStudentArray($registration, $event)
                : null,
        ]);
    }
}
