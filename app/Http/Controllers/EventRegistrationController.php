<?php

namespace App\Http\Controllers;

use App\Enums\EventStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Services\EventService;
use App\Services\RegistrationService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Student registration (SSD3-A). The registering student is always the
 * signed-in user; no identity is read from the request.
 */
class EventRegistrationController extends Controller
{
    public function __construct(
        private readonly RegistrationService $registrationService,
        private readonly EventService $eventService
    ) {}

    public function index(Request $request): Response
    {
        $registrations = $request->user()
            ->eventRegistrations()
            ->with(['event' => fn ($query) => $query->with('location')->withCount('registrations')])
            ->latest('registered_at')
            ->latest('registration_id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (EventRegistration $registration) => [
                'event' => $this->eventService->toPublicArray($registration->event),
                'registration' => $this->registrationService->toStudentArray(
                    $registration,
                    $registration->event
                ),
            ]);

        return Inertia::render('Events/MyRegistrations', [
            'registrations' => $registrations,
        ]);
    }

    public function store(Request $request, Event $event): RedirectResponse
    {
        // Drafts and archived events do not exist for students.
        abort_unless($event->hasStatus(EventStatus::PUBLISHED), 404);

        Gate::authorize('register', $event);

        $this->registrationService->register($event, $request->user());

        return back()->with('success', "You are registered for {$event->title}.");
    }
}
