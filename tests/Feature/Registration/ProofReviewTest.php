<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-20 13:00:00', 'Asia/Manila'));

    Storage::fake('local');
    Storage::disk('local')->put('proofs/selfie.png', 'photo-bytes');

    $this->faculty = User::factory()->create(['role' => 'faculty']);
    $this->otherFaculty = User::factory()->create(['role' => 'faculty']);
    $this->admin = User::factory()->create(['role' => 'admin']);

    $this->event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]);

    $this->registration = EventRegistration::factory()
        ->for($this->event)
        ->submitted('proofs/selfie.png')
        ->create(['proof_uploaded_at' => '2026-11-20 10:30:00']);

    $this->student = $this->registration->student;
});

/**
 * @param  array<string, mixed>  $data
 * @return array<string, mixed>
 */
function reviewPayload(array $data = []): array
{
    return ['proof_version' => '2026-11-20 10:30:00', ...$data];
}

test('faculty can approve proof for their own event', function () {
    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Proof photo approved.');

    expect($this->registration->refresh())
        ->proof_status->toBe('APPROVED')
        ->proof_reviewed_by_user_id->toBe($this->faculty->id)
        ->proof_rejection_reason->toBeNull()
        ->and($this->registration->proof_reviewed_at?->format('Y-m-d H:i'))->toBe('2026-11-20 13:00');
});

test('a rejection records the reason shown to the student', function () {
    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'reject', 'reason' => '  The event is not visible in the photo.  '])
        )
        ->assertSessionHasNoErrors();

    expect($this->registration->refresh())
        ->proof_status->toBe('REJECTED')
        ->proof_rejection_reason->toBe('The event is not visible in the photo.')
        ->proof_reviewed_by_user_id->toBe($this->faculty->id);

    $this->actingAs($this->student)
        ->get(route('events.show', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.proof_status', 'REJECTED')
            ->where('registration.proof_rejection_reason', 'The event is not visible in the photo.')
            ->where('registration.can_upload_proof', true));
});

test('a rejection needs a reason', function () {
    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'reject', 'reason' => ''])
        )
        ->assertSessionHasErrors(['reason' => 'Give the student a reason for the rejection.']);

    expect($this->registration->refresh()->proof_status)->toBe('PENDING');
});

test('admin can review proof for any event', function () {
    $this->actingAs($this->admin)
        ->patch(
            route('admin.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertSessionHasNoErrors();

    expect($this->registration->refresh())
        ->proof_status->toBe('APPROVED')
        ->proof_reviewed_by_user_id->toBe($this->admin->id);
});

test('faculty cannot review proof for another faculty member\'s event', function () {
    $this->actingAs($this->otherFaculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertForbidden();

    expect($this->registration->refresh()->proof_status)->toBe('PENDING');
});

test('students cannot review proof', function () {
    $this->actingAs($this->student)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertForbidden();

    expect($this->registration->refresh()->proof_status)->toBe('PENDING');
});

test('only photos awaiting review can be reviewed', function (array $state) {
    $this->registration->update($state);

    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'reject', 'reason' => 'Changed my mind'])
        )
        ->assertSessionHasErrors(['proof' => 'This proof is no longer awaiting review.']);
})->with([
    'already approved' => [['proof_status' => 'APPROVED']],
    'already rejected' => [['proof_status' => 'REJECTED']],
    'no photo uploaded' => [['proof_photo_path' => null, 'proof_uploaded_at' => null]],
]);

test('a photo replaced after the reviewer opened it is not reviewed unseen', function () {
    $this->registration->update(['proof_uploaded_at' => '2026-11-20 12:45:00']);

    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$this->event, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertSessionHasErrors(['proof' => 'The student uploaded a new photo. Review the new photo instead.']);

    expect($this->registration->refresh()->proof_status)->toBe('PENDING');
});

test('a registration cannot be reviewed through another event\'s URL', function () {
    $ownEvent = Event::factory()->for($this->faculty, 'creator')->published()->create();

    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.proof.review', [$ownEvent, $this->registration]),
            reviewPayload(['decision' => 'approve'])
        )
        ->assertNotFound();
});

/*
|--------------------------------------------------------------------------
| Private proof access
|--------------------------------------------------------------------------
*/

test('proof photos are served only to the owner and the event\'s managers', function () {
    $url = route('registrations.proof.show', $this->registration);

    $this->get($url)->assertRedirect(route('login'));

    $this->actingAs(User::factory()->create(['role' => 'student']))->get($url)->assertForbidden();
    $this->actingAs($this->otherFaculty)->get($url)->assertForbidden();

    foreach ([$this->student, $this->faculty, $this->admin] as $viewer) {
        $response = $this->actingAs($viewer)->get($url)->assertOk();

        expect($response->streamedContent())->toBe('photo-bytes')
            ->and($response->headers->get('Cache-Control'))->toContain('no-store');
    }
});

test('a registration without a photo has nothing to serve', function () {
    $this->registration->update(['proof_photo_path' => null]);

    $this->actingAs($this->student)
        ->get(route('registrations.proof.show', $this->registration))
        ->assertNotFound();
});

/*
|--------------------------------------------------------------------------
| Participants page
|--------------------------------------------------------------------------
*/

test('faculty see the participants of their own event', function () {
    EventRegistration::factory()->for($this->event)->awaitingProof()->create();

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.participants.index', $this->event))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Manage/Participants')
            ->where('event.event_id', $this->event->event_id)
            ->where('event.registered_count', 2)
            ->where('event.pending_review_count', 1)
            ->has('registrations.data', 2)
            // Photos awaiting review are listed first.
            ->where('registrations.data.0.registration_id', $this->registration->registration_id)
            ->where('registrations.data.0.awaiting_review', true)
            ->has('registrations.data.0.student.name'));

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.participants.index', [$this->event, 'proof' => 'missing']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('currentFilter', 'missing')
            ->has('registrations.data', 1)
            ->where('registrations.data.0.awaiting_review', false));
});

test('participants are private to the event\'s managers', function () {
    $this->actingAs($this->otherFaculty)
        ->get(route('faculty.events.participants.index', $this->event))
        ->assertForbidden();

    $this->actingAs($this->student)
        ->get(route('faculty.events.participants.index', $this->event))
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->get(route('admin.events.participants.index', $this->event))
        ->assertOk();
});

test('the management list shows registrations and photos awaiting review', function () {
    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('events.data.0.registered_count', 1)
            ->where('events.data.0.pending_review_count', 1));
});
