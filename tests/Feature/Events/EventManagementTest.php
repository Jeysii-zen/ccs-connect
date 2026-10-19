<?php

use App\Models\ActivityLog;
use App\Models\Event;
use App\Models\Location;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

// A real 1x1 PNG, so the "image" rule's content sniffing accepts it.
const EVENT_TEST_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function eventPoster(string $name = 'poster.png'): UploadedFile
{
    return UploadedFile::fake()->createWithContent($name, base64_decode(EVENT_TEST_PNG, true));
}

/**
 * A valid create/update payload relative to the frozen test clock
 * (2026-11-01 08:00, Asia/Manila).
 *
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function eventPayload(array $overrides = []): array
{
    return array_merge([
        'title' => 'CCS Tech Summit',
        'description' => 'Annual technology summit for CCS students.',
        'event_date' => '2026-11-20',
        'start_time' => '09:00',
        'end_time' => '12:00',
        'location_id' => Location::factory()->create()->location_id,
        'target_participants' => 'BSIT and BSCS students',
        'max_participants' => 150,
        'registration_deadline' => '2026-11-18T17:00',
        'proof_photo_required' => false,
        'poster' => eventPoster(),
    ], $overrides);
}

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    Storage::fake('public');

    $this->admin = User::factory()->create(['role' => 'admin']);
    $this->faculty = User::factory()->create(['role' => 'faculty']);
    $this->otherFaculty = User::factory()->create(['role' => 'faculty']);
    $this->student = User::factory()->create(['role' => 'student']);
});

/*
|--------------------------------------------------------------------------
| Access
|--------------------------------------------------------------------------
*/

test('admin and faculty can open their event management pages', function () {
    $this->actingAs($this->admin)
        ->get(route('admin.events.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Manage/Index')
            ->where('routePrefix', 'admin')
            ->where('currentView', 'all')
            ->has('events.data')
            ->has('locations')
            ->has('eventCounts')
        );

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Manage/Index')
            ->where('routePrefix', 'faculty')
        );
});

test('students cannot reach event management', function () {
    $this->actingAs($this->student)->get(route('admin.events.index'))->assertForbidden();
    $this->actingAs($this->student)->get(route('faculty.events.index'))->assertForbidden();
    $this->actingAs($this->student)->post(route('faculty.events.store'), eventPayload())->assertForbidden();

    expect(Event::count())->toBe(0);
});

test('guests are redirected away from event management', function () {
    $this->get(route('admin.events.index'))->assertRedirect(route('login'));
    $this->post(route('faculty.events.store'), eventPayload())->assertRedirect(route('login'));

    expect(Event::count())->toBe(0);
});

test('each role is limited to its own management area', function () {
    $this->actingAs($this->faculty)->get(route('admin.events.index'))->assertForbidden();
    $this->actingAs($this->admin)->get(route('faculty.events.index'))->assertForbidden();
});

test('users who must change their password are sent to the first-login page', function () {
    $faculty = User::factory()->create(['role' => 'faculty', 'must_change_password' => true]);

    $this->actingAs($faculty)
        ->get(route('faculty.events.index'))
        ->assertRedirect(route('password.first-login.edit'));
});

/*
|--------------------------------------------------------------------------
| Creation
|--------------------------------------------------------------------------
*/

test('faculty can create a draft event', function () {
    $payload = eventPayload();

    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), $payload)
        ->assertRedirect(route('faculty.events.index', ['view' => 'drafts']))
        ->assertSessionHas('success', 'Event saved as draft successfully.');

    $event = Event::sole();

    expect($event->created_by_user_id)->toBe($this->faculty->id)
        ->and($event->event_status)->toBe('Draft')
        ->and($event->title)->toBe('CCS Tech Summit')
        ->and($event->event_date->toDateString())->toBe('2026-11-20')
        ->and($event->start_time)->toBe('09:00:00')
        ->and($event->end_time)->toBe('12:00:00')
        ->and($event->location_id)->toBe($payload['location_id'])
        ->and($event->max_participants)->toBe(150)
        ->and($event->registration_deadline->format('Y-m-d H:i'))->toBe('2026-11-18 17:00')
        ->and($event->proof_photo_required)->toBeFalse()
        ->and($event->proof_upload_start_at)->toBeNull()
        ->and($event->proof_upload_end_at)->toBeNull()
        ->and($event->poster_path)->toStartWith('events/');

    Storage::disk('public')->assertExists($event->poster_path);
});

test('admin can create and publish an event in one step', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.events.store'), eventPayload(['event_status' => 'Published']))
        ->assertRedirect(route('admin.events.index', ['view' => 'published']))
        ->assertSessionHas('success', 'Event published successfully.');

    expect(Event::sole())
        ->event_status->toBe('Published')
        ->created_by_user_id->toBe($this->admin->id);
});

test('events are never created archived', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['event_status' => 'Archived']))
        ->assertSessionHasErrors('event_status');

    expect(Event::count())->toBe(0);
});

test('the creator is always the signed-in user', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'created_by_user_id' => $this->otherFaculty->id,
        ]))
        ->assertRedirect();

    expect(Event::sole()->created_by_user_id)->toBe($this->faculty->id);
});

test('an event can require a proof photo with an upload window', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20T09:00',
            'proof_upload_end_at' => '2026-11-20T18:00',
        ]))
        ->assertSessionHasNoErrors();

    $event = Event::sole();

    expect($event->proof_photo_required)->toBeTrue()
        ->and($event->proof_upload_start_at?->format('Y-m-d H:i'))->toBe('2026-11-20 09:00')
        ->and($event->proof_upload_end_at?->format('Y-m-d H:i'))->toBe('2026-11-20 18:00');
});

test('the proof window is discarded when proof is not required', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'proof_photo_required' => false,
            'proof_upload_start_at' => '2026-11-20T09:00',
            'proof_upload_end_at' => '2026-11-20T18:00',
        ]))
        ->assertSessionHasNoErrors();

    expect(Event::sole())
        ->proof_upload_start_at->toBeNull()
        ->proof_upload_end_at->toBeNull();
});

/*
|--------------------------------------------------------------------------
| Validation
|--------------------------------------------------------------------------
*/

test('required event fields are validated', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), [])
        ->assertSessionHasErrors([
            'title',
            'description',
            'event_date',
            'start_time',
            'end_time',
            'location_id',
            'target_participants',
            'max_participants',
            'registration_deadline',
            'poster',
            'proof_photo_required',
        ]);

    expect(Event::count())->toBe(0);
});

test('event schedule rules are enforced', function (array $overrides, string $field) {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload($overrides))
        ->assertSessionHasErrors($field);

    expect(Event::count())->toBe(0);
})->with([
    'end before start' => [['start_time' => '13:00', 'end_time' => '12:00'], 'end_time'],
    'end equals start' => [['end_time' => '09:00'], 'end_time'],
    'event in the past' => [['event_date' => '2026-10-30', 'registration_deadline' => '2026-10-29T17:00'], 'event_date'],
    'malformed date' => [['event_date' => '20/11/2026'], 'event_date'],
    'malformed time' => [['start_time' => '9am'], 'start_time'],
    'deadline after start' => [['registration_deadline' => '2026-11-20T10:00'], 'registration_deadline'],
    'deadline in the past' => [['registration_deadline' => '2026-10-31T17:00'], 'registration_deadline'],
]);

test('capacity must be a positive whole number', function (mixed $value) {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['max_participants' => $value]))
        ->assertSessionHasErrors('max_participants');
})->with([0, -5, 'many', 12.5, 100001]);

test('only predefined locations can be chosen', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['location_id' => 999999]))
        ->assertSessionHasErrors('location_id');

    expect(Event::count())->toBe(0);
});

test('proof window rules are enforced when proof is required', function (array $overrides, string $field) {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20T09:00',
            'proof_upload_end_at' => '2026-11-20T18:00',
            ...$overrides,
        ]))
        ->assertSessionHasErrors($field);

    expect(Event::count())->toBe(0);
})->with([
    'missing start' => [['proof_upload_start_at' => null], 'proof_upload_start_at'],
    'missing end' => [['proof_upload_end_at' => null], 'proof_upload_end_at'],
    'opens before the event' => [['proof_upload_start_at' => '2026-11-19T09:00'], 'proof_upload_start_at'],
    'closes before it opens' => [['proof_upload_end_at' => '2026-11-20T08:00'], 'proof_upload_end_at'],
]);

/*
|--------------------------------------------------------------------------
| Poster files
|--------------------------------------------------------------------------
*/

test('posters must be images of an allowed type', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'poster' => UploadedFile::fake()->create('poster.pdf', 10, 'application/pdf'),
        ]))
        ->assertSessionHasErrors('poster');

    expect(Event::count())->toBe(0);
    expect(Storage::disk('public')->allFiles('events'))->toBe([]);
});

test('posters larger than 15 MB are rejected', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'poster' => UploadedFile::fake()->create('huge.png', 15361, 'image/png'),
        ]))
        ->assertSessionHasErrors('poster');

    expect(Event::count())->toBe(0);
});

test('replacing a poster stores the new file and removes the old one', function () {
    Storage::disk('public')->put('events/old.png', 'old');

    $event = Event::factory()->for($this->faculty, 'creator')->create([
        'poster_path' => 'events/old.png',
    ]);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), eventPayload([
            'poster' => eventPoster('new.png'),
        ]))
        ->assertSessionHasNoErrors();

    $event->refresh();

    expect($event->poster_path)->not->toBe('events/old.png');
    Storage::disk('public')->assertExists($event->poster_path);
    Storage::disk('public')->assertMissing('events/old.png');
});

test('editing without a new poster keeps the current one', function () {
    Storage::disk('public')->put('events/keep.png', 'keep');

    $event = Event::factory()->for($this->faculty, 'creator')->create([
        'poster_path' => 'events/keep.png',
    ]);

    $payload = eventPayload();
    unset($payload['poster']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), $payload)
        ->assertSessionHasNoErrors();

    expect($event->refresh()->poster_path)->toBe('events/keep.png');
    Storage::disk('public')->assertExists('events/keep.png');
});

test('a failed edit keeps the old poster and removes the new upload', function () {
    Storage::disk('public')->put('events/old.png', 'old');

    $event = Event::factory()->for($this->faculty, 'creator')->create([
        'poster_path' => 'events/old.png',
    ]);

    // Fails inside the transaction, after the new poster was stored.
    Event::updating(fn () => throw new RuntimeException('Database unavailable'));

    $this->withoutExceptionHandling();

    expect(fn () => $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), eventPayload([
            'poster' => eventPoster('new.png'),
        ])))->toThrow(RuntimeException::class);

    expect($event->refresh()->poster_path)->toBe('events/old.png');
    expect(Storage::disk('public')->allFiles('events'))->toBe(['events/old.png']);
    expect(ActivityLog::where('module', 'Event')->count())->toBe(0);
});

/*
|--------------------------------------------------------------------------
| Listing and ownership
|--------------------------------------------------------------------------
*/

test('faculty only see the events they created', function () {
    $own = Event::factory()->for($this->faculty, 'creator')->create(['title' => 'Mine']);
    Event::factory()->for($this->otherFaculty, 'creator')->create(['title' => 'Theirs']);
    Event::factory()->for($this->admin, 'creator')->published()->create(['title' => 'Admin event']);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('events.data', 1)
            ->where('events.data.0.event_id', $own->event_id)
            ->where('events.data.0.title', 'Mine')
            ->where('eventCounts.all', 1)
        );
});

test('admin sees every event with its creator and location', function () {
    $location = Location::factory()->create(['location_name' => 'Main Hall']);

    Event::factory()->for($this->faculty, 'creator')->for($location)->create();
    Event::factory()->for($this->otherFaculty, 'creator')->published()->create();
    Event::factory()->for($this->admin, 'creator')->archived()->create();

    $this->actingAs($this->admin)
        ->get(route('admin.events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('events.data', 3)
            ->where('eventCounts', [
                'all' => 3,
                'drafts' => 1,
                'published' => 1,
                'archived' => 1,
            ])
            ->has('events.data.0.creator.name')
            ->has('events.data.0.location.location_name')
        );
});

test('the listing filters by status view and title search', function () {
    Event::factory()->for($this->faculty, 'creator')->create(['title' => 'Draft Seminar']);
    Event::factory()->for($this->faculty, 'creator')->published()->create(['title' => 'Hackathon 2026']);
    Event::factory()->for($this->faculty, 'creator')->published()->create(['title' => 'Coding Bootcamp']);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index', ['view' => 'published']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('currentView', 'published')
            ->has('events.data', 2)
        );

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index', ['view' => 'published', 'q' => 'hack']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('events.data', 1)
            ->where('events.data.0.title', 'Hackathon 2026')
        );

    // Unknown views fall back to all events; LIKE wildcards are literal.
    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index', ['view' => 'bogus', 'q' => '%']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('currentView', 'all')
            ->has('events.data', 0)
        );
});

test('the listing is paginated', function () {
    Event::factory()->count(12)->for($this->faculty, 'creator')->create();

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('events.data', 10)
            ->where('events.total', 12)
            ->where('events.last_page', 2)
        );

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->has('events.data', 2));
});

/*
|--------------------------------------------------------------------------
| Updates
|--------------------------------------------------------------------------
*/

test('faculty can edit their own event', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->create();

    $payload = eventPayload(['title' => 'Updated Summit', 'max_participants' => 80]);
    unset($payload['poster']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), $payload)
        ->assertRedirect()
        ->assertSessionHas('success', 'Event updated successfully.');

    expect($event->refresh())
        ->title->toBe('Updated Summit')
        ->max_participants->toBe(80);
});

test('faculty cannot edit, publish, archive or delete another faculty member\'s event', function () {
    $event = Event::factory()->for($this->otherFaculty, 'creator')->create(['title' => 'Not yours']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), eventPayload(['title' => 'Hijacked']))
        ->assertForbidden();
    $this->actingAs($this->faculty)->patch(route('faculty.events.publish', $event))->assertForbidden();
    $this->actingAs($this->faculty)->patch(route('faculty.events.archive', $event))->assertForbidden();
    $this->actingAs($this->faculty)->delete(route('faculty.events.destroy', $event))->assertForbidden();

    expect($event->refresh())
        ->title->toBe('Not yours')
        ->event_status->toBe('Draft');
    expect(ActivityLog::where('module', 'Event')->count())->toBe(0);
});

test('admin can edit any event', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->create();

    $payload = eventPayload(['title' => 'Edited by admin']);
    unset($payload['poster']);

    $this->actingAs($this->admin)
        ->put(route('admin.events.update', $event), $payload)
        ->assertSessionHasNoErrors();

    expect($event->refresh())
        ->title->toBe('Edited by admin')
        ->created_by_user_id->toBe($this->faculty->id);
});

test('editing cannot change the creator or the lifecycle status', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->create();

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), eventPayload([
            'created_by_user_id' => $this->otherFaculty->id,
            'event_status' => 'Published',
        ]))
        ->assertSessionHasNoErrors();

    expect($event->refresh())
        ->created_by_user_id->toBe($this->faculty->id)
        ->event_status->toBe('Draft');
});

test('archived events cannot be edited', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->archived()->create(['title' => 'Old']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), eventPayload(['title' => 'Changed']))
        ->assertSessionHasErrors('event');

    expect($event->refresh()->title)->toBe('Old');
    expect(Storage::disk('public')->allFiles('events'))->toBe([]);
});

test('a past event can be corrected without moving its schedule', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'event_date' => '2026-10-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-10-18 17:00:00',
    ]);

    $payload = eventPayload([
        'event_date' => '2026-10-20',
        'registration_deadline' => '2026-10-18T17:00',
        'description' => 'Corrected description.',
    ]);
    unset($payload['poster']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), $payload)
        ->assertSessionHasNoErrors();

    expect($event->refresh()->description)->toBe('Corrected description.');
});

test('moving an event into the past is rejected', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->create();

    $payload = eventPayload([
        'event_date' => '2026-10-25',
        'registration_deadline' => '2026-10-24T17:00',
    ]);
    unset($payload['poster']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), $payload)
        ->assertSessionHasErrors(['event_date']);
});

/*
|--------------------------------------------------------------------------
| Deletion and activity logging
|--------------------------------------------------------------------------
*/

test('deleting an event removes it and its poster', function () {
    Storage::disk('public')->put('events/delete-me.png', 'poster');

    $event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'title' => 'Farewell Party',
        'poster_path' => 'events/delete-me.png',
    ]);

    $this->actingAs($this->faculty)
        ->delete(route('faculty.events.destroy', $event))
        ->assertRedirect(route('faculty.events.index'))
        ->assertSessionHas('success', 'Event deleted successfully.');

    expect(Event::find($event->event_id))->toBeNull();
    Storage::disk('public')->assertMissing('events/delete-me.png');
});

test('event management actions are recorded in the activity log', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['title' => 'Logged Event']))
        ->assertSessionHasNoErrors();

    $event = Event::sole();

    $payload = eventPayload(['title' => 'Logged Event v2']);
    unset($payload['poster']);

    $this->actingAs($this->faculty)->put(route('faculty.events.update', $event), $payload);
    $this->actingAs($this->faculty)->patch(route('faculty.events.publish', $event));
    $this->actingAs($this->faculty)->patch(route('faculty.events.archive', $event));
    $this->actingAs($this->faculty)->delete(route('faculty.events.destroy', $event));

    $logs = ActivityLog::query()
        ->where('module', 'Event')
        ->orderBy('activity_log_id')
        ->get(['user_id', 'action', 'description']);

    expect($logs->pluck('action')->all())
        ->toBe(['Created', 'Updated', 'Published', 'Archived', 'Deleted'])
        ->and($logs->pluck('user_id')->unique()->all())->toBe([$this->faculty->id])
        ->and($logs->first()->description)->toBe('Created event: Logged Event')
        ->and($logs->last()->description)->toBe('Deleted event: Logged Event v2');
});

test('rejected requests do not write success logs', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['title' => '']))
        ->assertSessionHasErrors('title');

    $archived = Event::factory()->for($this->faculty, 'creator')->archived()->create();
    $this->actingAs($this->faculty)->patch(route('faculty.events.publish', $archived))
        ->assertSessionHasErrors('event');

    expect(ActivityLog::where('module', 'Event')->count())->toBe(0);
});

/*
|--------------------------------------------------------------------------
| Registration deadline boundaries
|--------------------------------------------------------------------------
*/

test('a deadline exactly at the event start is accepted', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['registration_deadline' => '2026-11-20T09:00']))
        ->assertSessionHasNoErrors();

    expect(Event::sole()->registration_deadline->format('Y-m-d H:i'))->toBe('2026-11-20 09:00');
});

test('a deadline one minute from now is accepted', function () {
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['registration_deadline' => '2026-11-01T08:01']))
        ->assertSessionHasNoErrors();
});

test('deadline errors name the boundary they were checked against', function () {
    // 5 PM on the day of a 9 AM event.
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['registration_deadline' => '2026-11-20T17:00']))
        ->assertSessionHasErrors([
            'registration_deadline' => 'The registration deadline must be on or before the event start (Nov 20, 2026 9:00 AM).',
        ]);

    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload(['registration_deadline' => '2026-11-01T08:00']))
        ->assertSessionHasErrors([
            'registration_deadline' => 'The registration deadline must be in the future (it is now Nov 1, 2026 8:00 AM).',
        ]);

    expect(Event::count())->toBe(0);
});

test('time values sent with seconds are accepted', function () {
    // Safari sends time and datetime-local values with seconds.
    $this->actingAs($this->faculty)
        ->post(route('faculty.events.store'), eventPayload([
            'start_time' => '09:00:00',
            'end_time' => '12:00:00.000',
            'registration_deadline' => '2026-11-18T17:00:00',
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20T09:00:00',
            'proof_upload_end_at' => '2026-11-20T18:00:00',
        ]))
        ->assertSessionHasNoErrors();

    expect(Event::sole())
        ->start_time->toBe('09:00:00')
        ->end_time->toBe('12:00:00');
});

test('an unchanged past deadline sent with seconds is not re-checked', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'event_date' => '2026-10-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-10-18 17:00:00',
    ]);

    $payload = eventPayload([
        'event_date' => '2026-10-20',
        'start_time' => '09:00:00',
        'registration_deadline' => '2026-10-18T17:00:00',
        'description' => 'Corrected again.',
    ]);
    unset($payload['poster']);

    $this->actingAs($this->faculty)
        ->put(route('faculty.events.update', $event), $payload)
        ->assertSessionHasNoErrors();

    expect($event->refresh()->description)->toBe('Corrected again.');
});
