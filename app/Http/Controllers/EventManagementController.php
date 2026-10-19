<?php

namespace App\Http\Controllers;

use App\Enums\EventStatus;
use App\Enums\ProofStatus;
use App\Http\Requests\Event\StoreEventRequest;
use App\Http\Requests\Event\UpdateEventRequest;
use App\Models\Event;
use App\Models\Location;
use App\Models\User;
use App\Services\EventService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Event management for Admin (/admin/events) and Faculty (/faculty/events).
 * Both route groups share this controller; the role middleware picks the
 * group and EventPolicy enforces ownership.
 */
class EventManagementController extends Controller
{
    private const VIEWS = [
        'all' => null,
        'drafts' => EventStatus::DRAFT,
        'published' => EventStatus::PUBLISHED,
        'archived' => EventStatus::ARCHIVED,
    ];

    public function __construct(
        private readonly EventService $eventService
    ) {}

    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Event::class);

        $user = $request->user();

        $view = $request->query('view', 'all');
        $view = is_string($view) && array_key_exists($view, self::VIEWS) ? $view : 'all';

        $search = trim((string) $request->query('q', ''));
        $search = mb_substr($search, 0, 100);

        $events = Event::query()
            ->manageableBy($user)
            ->with(['location', 'creator:id,first_name,last_name'])
            ->withCount([
                'registrations',
                'registrations as pending_review_count' => fn (Builder $query) => $query
                    ->where('proof_status', ProofStatus::PENDING->value)
                    ->whereNotNull('proof_photo_path'),
            ])
            ->when(
                self::VIEWS[$view],
                fn (Builder $query, EventStatus $status) => $query->where('event_status', $status->value)
            )
            ->when(
                $search !== '',
                fn (Builder $query) => $query->where(
                    'title',
                    'like',
                    '%'.addcslashes($search, '%_\\').'%'
                )
            )
            ->orderByDesc('event_date')
            ->orderByDesc('start_time')
            ->orderByDesc('event_id')
            ->paginate(10)
            ->withQueryString()
            ->through(fn (Event $event) => $this->eventService->toManagementArray($event));

        $counts = Event::query()
            ->manageableBy($user)
            ->selectRaw('event_status, count(*) as total')
            ->groupBy('event_status')
            ->pluck('total', 'event_status');

        return Inertia::render('Events/Manage/Index', [
            'events' => $events,
            'currentView' => $view,
            'filters' => ['q' => $search],
            'eventCounts' => [
                'all' => (int) $counts->sum(),
                'drafts' => (int) ($counts[EventStatus::DRAFT->value] ?? 0),
                'published' => (int) ($counts[EventStatus::PUBLISHED->value] ?? 0),
                'archived' => (int) ($counts[EventStatus::ARCHIVED->value] ?? 0),
            ],
            'locations' => Location::query()
                ->orderBy('location_name')
                ->get(['location_id', 'location_name', 'building', 'floor', 'room_number']),
            'routePrefix' => $this->routePrefix($user),
        ]);
    }

    public function store(StoreEventRequest $request): RedirectResponse
    {
        $user = $request->user();

        $event = $this->eventService->create($user, $request->validated(), $request->poster());

        $published = $event->hasStatus(EventStatus::PUBLISHED);

        return to_route("{$this->routePrefix($user)}.events.index", [
            'view' => $published ? 'published' : 'drafts',
        ])->with(
            'success',
            $published
                ? 'Event published successfully.'
                : 'Event saved as draft successfully.'
        );
    }

    public function update(UpdateEventRequest $request, Event $event): RedirectResponse
    {
        $this->eventService->update(
            $event,
            $request->user(),
            $request->validated(),
            $request->poster()
        );

        return back()->with('success', 'Event updated successfully.');
    }

    public function publish(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('publish', $event);

        $this->eventService->publish($event, $request->user());

        return back()->with('success', 'Event published successfully.');
    }

    public function archive(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('archive', $event);

        $this->eventService->archive($event, $request->user());

        return back()->with('success', 'Event archived successfully.');
    }

    public function destroy(Request $request, Event $event): RedirectResponse
    {
        Gate::authorize('delete', $event);

        $user = $request->user();

        $this->eventService->delete($event, $user);

        return to_route("{$this->routePrefix($user)}.events.index")
            ->with('success', 'Event deleted successfully.');
    }

    /**
     * Route-name prefix of the management area the user works in.
     */
    private function routePrefix(User $user): string
    {
        return $user->role === 'admin' ? 'admin' : 'faculty';
    }
}
