<?php

use App\Models\ActivityLog;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * A published event on 2026-11-20 09:00–12:00 whose registration closes
 * 2026-11-18 17:00 (clock frozen at 2026-11-01 08:00 Manila).
 *
 * @param  array<string, mixed>  $attributes
 */
function registrableEvent(array $attributes = []): Event
{
    return Event::factory()->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'max_participants' => 50,
        ...$attributes,
    ]);
}

/**
 * @param  array<string, mixed>  $attributes
 */
function registeringStudent(array $attributes = []): User
{
    return User::factory()->create([
        'role' => 'student',
        'year_level' => '3',
        'block_number' => '2',
        ...$attributes,
    ]);
}

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    $this->student = registeringStudent();
});

/*
|--------------------------------------------------------------------------
| Registering
|--------------------------------------------------------------------------
*/

test('an eligible student can register and their year and block are snapshotted', function () {
    $event = registrableEvent();

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertRedirect()
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', "You are registered for {$event->title}.");

    $registration = EventRegistration::sole();

    expect($registration->event_id)->toBe($event->event_id)
        ->and($registration->user_id)->toBe($this->student->id)
        ->and($registration->year_level_at_registration)->toBe('3')
        ->and($registration->block_at_registration)->toBe('2')
        ->and($registration->registered_at->format('Y-m-d H:i'))->toBe('2026-11-01 08:00')
        ->and($registration->proof_status)->toBe('NOT_REQUIRED')
        ->and($registration->attendance_status)->toBe('PENDING');

    // A later account change does not rewrite the snapshot.
    $this->student->update(['year_level' => '4', 'block_number' => '1']);

    expect($registration->refresh())
        ->year_level_at_registration->toBe('3')
        ->block_at_registration->toBe('2');
});

test('registrations for events that require proof start awaiting the photo', function () {
    $event = registrableEvent([
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]);

    $this->actingAs($this->student)->post(route('student.registrations.store', $event));

    expect(EventRegistration::sole())
        ->proof_status->toBe('PENDING')
        ->proof_photo_path->toBeNull();
});

test('the registering student is always the signed-in user', function () {
    $event = registrableEvent();
    $other = registeringStudent();

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event), [
            'user_id' => $other->id,
            'year_level_at_registration' => '1',
            'proof_status' => 'APPROVED',
        ])
        ->assertSessionHasNoErrors();

    expect(EventRegistration::sole())
        ->user_id->toBe($this->student->id)
        ->year_level_at_registration->toBe('3')
        ->proof_status->toBe('NOT_REQUIRED');
});

test('only students can register', function () {
    $event = registrableEvent();

    $this->post(route('student.registrations.store', $event))->assertRedirect(route('login'));

    foreach (['faculty', 'admin'] as $role) {
        $this->actingAs(User::factory()->create(['role' => $role]))
            ->post(route('student.registrations.store', $event))
            ->assertForbidden();
    }

    expect(EventRegistration::count())->toBe(0);
});

test('drafts and archived events cannot be registered for', function (string $status) {
    $event = registrableEvent(['event_status' => $status]);

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertNotFound();

    expect(EventRegistration::count())->toBe(0);
})->with(['Draft', 'Archived']);

test('registration is rejected once it has closed', function (string $now) {
    $event = registrableEvent();

    $this->travelTo(Carbon::parse($now, 'Asia/Manila'));

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertSessionHasErrors(['registration' => 'Registration for this event has closed.']);

    expect(EventRegistration::count())->toBe(0);
})->with([
    'after the deadline' => '2026-11-18 17:01:00',
    'during the event' => '2026-11-20 10:00:00',
    'after the event' => '2026-11-21 08:00:00',
]);

test('a full event rejects further registrations', function () {
    $event = registrableEvent(['max_participants' => 2]);

    foreach (range(1, 2) as $seat) {
        $this->actingAs(registeringStudent())
            ->post(route('student.registrations.store', $event))
            ->assertSessionHasNoErrors();
    }

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertSessionHasErrors(['registration' => 'This event is full.']);

    expect($event->registrations()->count())->toBe(2);
});

test('a student cannot register twice for the same event', function () {
    $event = registrableEvent();

    $this->actingAs($this->student)->post(route('student.registrations.store', $event));

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertSessionHasErrors(['registration' => 'You are already registered for this event.']);

    expect(EventRegistration::count())->toBe(1);
});

test('a duplicate from a parallel request is reported, not raised', function () {
    $event = registrableEvent();

    // Simulates another request inserting the same registration after this
    // request's duplicate check passed.
    EventRegistration::creating(function (EventRegistration $registration) {
        DB::table('event_registrations')->insert([
            'event_id' => $registration->event_id,
            'user_id' => $registration->user_id,
            'year_level_at_registration' => '3',
            'block_at_registration' => '2',
            'registered_at' => now(),
            'proof_status' => 'NOT_REQUIRED',
            'attendance_status' => 'PENDING',
        ]);
    });

    $this->actingAs($this->student)
        ->post(route('student.registrations.store', $event))
        ->assertSessionHasErrors(['registration' => 'You are already registered for this event.']);

    // The simulated row shares this request's transaction, so it is rolled
    // back with it. In a real race it belongs to the other request, which
    // commits independently (and waits on the event row lock).
    expect(EventRegistration::count())->toBe(0);
});

test('the database rejects duplicate registrations', function () {
    $registration = EventRegistration::factory()->create();

    expect(fn () => EventRegistration::factory()->create([
        'event_id' => $registration->event_id,
        'user_id' => $registration->user_id,
    ]))->toThrow(UniqueConstraintViolationException::class);
});

test('students without a year level or block cannot register', function () {
    $event = registrableEvent();
    $student = registeringStudent(['block_number' => null]);

    $this->actingAs($student)
        ->post(route('student.registrations.store', $event))
        ->assertSessionHasErrors('registration');

    expect(EventRegistration::count())->toBe(0);
});

test('registrations cannot be cancelled', function () {
    $event = registrableEvent();

    $this->actingAs($this->student)->post(route('student.registrations.store', $event));

    expect(Route::has('student.registrations.destroy'))->toBeFalse();

    $this->actingAs($this->student)
        ->delete("/events/{$event->event_id}/register")
        ->assertMethodNotAllowed();

    expect(EventRegistration::count())->toBe(1);
});

test('registering and proof actions are not written to the activity log', function () {
    // Questionnaire Q15 leaves "Event attendance/proof actions" unchecked.
    $this->actingAs($this->student)->post(route('student.registrations.store', registrableEvent()));

    expect(ActivityLog::count())->toBe(0);
});

/*
|--------------------------------------------------------------------------
| Event page and "My events"
|--------------------------------------------------------------------------
*/

test('the event page tells each viewer whether they can register', function () {
    $event = registrableEvent(['max_participants' => 1]);

    $this->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrationState', 'guest')
            ->where('registration', null));

    $this->actingAs(User::factory()->create(['role' => 'faculty']))
        ->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page->where('registrationState', 'not_student'));

    $this->actingAs($this->student)
        ->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrationState', 'available')
            ->where('event.registered_count', 0));

    $this->actingAs($this->student)->post(route('student.registrations.store', $event));

    $this->actingAs($this->student)
        ->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrationState', 'registered')
            ->where('registration.year_level', '3')
            ->where('registration.proof_status', 'NOT_REQUIRED')
            ->where('event.lifecycle_status', 'Full'));

    $this->actingAs(registeringStudent())
        ->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrationState', 'full')
            ->where('registration', null));
});

test('a closed event shows as closed to students', function () {
    $event = registrableEvent();

    $this->travelTo(Carbon::parse('2026-11-19 08:00:00', 'Asia/Manila'));

    $this->actingAs($this->student)
        ->get(route('events.show', $event))
        ->assertInertia(fn (Assert $page) => $page->where('registrationState', 'closed'));
});

test('my events lists only the signed-in student\'s registrations', function () {
    $mine = EventRegistration::factory()->for($this->student, 'student')->create();
    EventRegistration::factory()->create();

    $this->actingAs($this->student)
        ->get(route('student.registrations.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/MyRegistrations')
            ->has('registrations.data', 1)
            ->where('registrations.data.0.registration.registration_id', $mine->registration_id)
            ->where('registrations.data.0.event.event_id', $mine->event_id));

    $this->actingAs(User::factory()->create(['role' => 'faculty']))
        ->get(route('student.registrations.index'))
        ->assertForbidden();
});

/*
|--------------------------------------------------------------------------
| Event management with registrations
|--------------------------------------------------------------------------
*/

test('capacity cannot drop below the registered students', function () {
    $faculty = User::factory()->create(['role' => 'faculty']);
    $event = registrableEvent(['created_by_user_id' => $faculty->id, 'max_participants' => 10]);
    EventRegistration::factory()->count(3)->for($event)->create();

    $this->actingAs($faculty)
        ->put(route('faculty.events.update', $event), [
            ...$event->only(['title', 'description', 'location_id', 'target_participants']),
            'event_date' => '2026-11-20',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'registration_deadline' => '2026-11-18T17:00',
            'max_participants' => 2,
            'proof_photo_required' => false,
        ])
        ->assertSessionHasErrors([
            'max_participants' => 'Max participants cannot be lower than the 3 students already registered.',
        ]);
});

test('the proof requirement is fixed once students have registered', function () {
    $faculty = User::factory()->create(['role' => 'faculty']);
    $event = registrableEvent(['created_by_user_id' => $faculty->id]);
    EventRegistration::factory()->for($event)->create();

    $this->actingAs($faculty)
        ->put(route('faculty.events.update', $event), [
            ...$event->only(['title', 'description', 'location_id', 'target_participants', 'max_participants']),
            'event_date' => '2026-11-20',
            'start_time' => '09:00',
            'end_time' => '12:00',
            'registration_deadline' => '2026-11-18T17:00',
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20T09:00',
            'proof_upload_end_at' => '2026-11-20T18:00',
        ])
        ->assertSessionHasErrors('proof_photo_required');

    expect($event->refresh()->proof_photo_required)->toBeFalse();
});

test('deleting an event removes its registrations and their proof photos', function () {
    Storage::fake('local');
    Storage::fake('public');
    Storage::disk('local')->put('proofs/1/photo.png', 'photo');

    $faculty = User::factory()->create(['role' => 'faculty']);
    $event = registrableEvent(['created_by_user_id' => $faculty->id]);
    EventRegistration::factory()->for($event)->submitted('proofs/1/photo.png')->create();

    $this->actingAs($faculty)
        ->delete(route('faculty.events.destroy', $event))
        ->assertSessionHasNoErrors();

    expect(EventRegistration::count())->toBe(0);
    Storage::disk('local')->assertMissing('proofs/1/photo.png');
});

test('archiving an event keeps its registrations', function () {
    $faculty = User::factory()->create(['role' => 'faculty']);
    $event = registrableEvent(['created_by_user_id' => $faculty->id]);
    EventRegistration::factory()->for($event)->create();

    $this->actingAs($faculty)->patch(route('faculty.events.archive', $event));

    expect($event->refresh()->event_status)->toBe('Archived')
        ->and($event->registrations()->count())->toBe(1);
});
