<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

function proofPhoto(string $name = 'selfie.png'): UploadedFile
{
    // A real 1x1 PNG, so the "image" rule's content sniffing accepts it.
    return UploadedFile::fake()->createWithContent(
        $name,
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', true)
    );
}

/**
 * Event on 2026-11-20 09:00–12:00 with proof uploads open 09:00–18:00.
 *
 * @param  array<string, mixed>  $attributes
 */
function proofEvent(array $attributes = []): Event
{
    return Event::factory()->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
        ...$attributes,
    ]);
}

beforeEach(function () {
    // Inside the upload window.
    $this->travelTo(Carbon::parse('2026-11-20 10:00:00', 'Asia/Manila'));

    Storage::fake('local');

    $this->event = proofEvent();
    $this->registration = EventRegistration::factory()->for($this->event)->awaitingProof()->create();
    $this->student = $this->registration->student;
});

test('a student can upload proof within the window', function () {
    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Proof photo uploaded successfully. It is now waiting for approval.');

    $registration = $this->registration->refresh();

    expect($registration->proof_status)->toBe('PENDING')
        ->and($registration->proof_photo_path)->toStartWith("proofs/{$this->event->event_id}/")
        ->and($registration->proof_uploaded_at?->format('Y-m-d H:i'))->toBe('2026-11-20 10:00')
        ->and($registration->isAwaitingReview())->toBeTrue();

    Storage::disk('local')->assertExists($registration->proof_photo_path);
});

test('proof photos are stored privately, never on the public disk', function () {
    Storage::fake('public');

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()]);

    expect(Storage::disk('public')->allFiles())->toBe([])
        ->and(Storage::disk('local')->allFiles())->toHaveCount(1);
});

test('uploads outside the window are rejected', function (string $now, string $message) {
    $this->travelTo(Carbon::parse($now, 'Asia/Manila'));

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertSessionHasErrors(['proof' => $message]);

    expect($this->registration->refresh()->proof_photo_path)->toBeNull();
    expect(Storage::disk('local')->allFiles())->toBe([]);
})->with([
    'before it opens' => ['2026-11-20 08:59:00', 'Proof uploads open on Nov 20, 2026 9:00 AM.'],
    'after it closes' => ['2026-11-20 18:01:00', 'The proof upload window closed on Nov 20, 2026 6:00 PM.'],
]);

test('events without a proof requirement do not accept photos', function () {
    $event = proofEvent([
        'proof_photo_required' => false,
        'proof_upload_start_at' => null,
        'proof_upload_end_at' => null,
    ]);
    $registration = EventRegistration::factory()->for($event)->for($this->student, 'student')->create();

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $registration), ['photo' => proofPhoto()])
        ->assertSessionHasErrors(['proof' => 'This event does not require a proof photo.']);
});

test('archived events no longer accept photos', function () {
    $this->event->update(['event_status' => 'Archived']);

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertSessionHasErrors('proof');
});

test('proof files must be images within the size limit', function (UploadedFile $file) {
    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => $file])
        ->assertSessionHasErrors('photo');

    expect(Storage::disk('local')->allFiles())->toBe([]);
})->with([
    'pdf' => fn () => UploadedFile::fake()->create('proof.pdf', 10, 'application/pdf'),
    // A real upload, not a fake: fakes take their type from the file name,
    // while real uploads are sniffed from their bytes.
    'text renamed to png' => function () {
        $path = tempnam(sys_get_temp_dir(), 'proof');
        file_put_contents($path, 'not an image');

        return new UploadedFile($path, 'proof.png', null, null, true);
    },
    'over 15 MB' => fn () => UploadedFile::fake()->create('huge.png', 15361, 'image/png'),
]);

test('a photo is required', function () {
    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), [])
        ->assertSessionHasErrors(['photo' => 'Choose a proof photo to upload.']);
});

test('a student cannot upload proof for another student\'s registration', function () {
    $this->actingAs(User::factory()->create(['role' => 'student']))
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertForbidden();

    expect($this->registration->refresh()->proof_photo_path)->toBeNull();
});

test('faculty cannot upload proof on a student\'s behalf', function () {
    $this->actingAs($this->event->creator)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertForbidden();
});

test('a photo still awaiting review can be replaced and the old file is removed', function () {
    Storage::disk('local')->put('proofs/old.png', 'old');
    $this->registration->update(['proof_photo_path' => 'proofs/old.png', 'proof_uploaded_at' => now()->subHour()]);

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto('new.png')])
        ->assertSessionHasNoErrors();

    $path = $this->registration->refresh()->proof_photo_path;

    expect($path)->not->toBe('proofs/old.png');
    Storage::disk('local')->assertExists($path);
    Storage::disk('local')->assertMissing('proofs/old.png');
});

test('a rejected photo can be re-uploaded and goes back to review', function () {
    Storage::disk('local')->put('proofs/rejected.png', 'old');
    $this->registration->update([
        'proof_status' => 'REJECTED',
        'proof_photo_path' => 'proofs/rejected.png',
        'proof_uploaded_at' => now()->subHour(),
        'proof_reviewed_by_user_id' => $this->event->created_by_user_id,
        'proof_reviewed_at' => now()->subMinutes(30),
        'proof_rejection_reason' => 'The event is not visible.',
    ]);

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertSessionHasNoErrors();

    expect($this->registration->refresh())
        ->proof_status->toBe('PENDING')
        ->proof_rejection_reason->toBeNull()
        ->proof_reviewed_by_user_id->toBeNull()
        ->proof_reviewed_at->toBeNull();

    Storage::disk('local')->assertMissing('proofs/rejected.png');
});

test('an approved photo cannot be replaced', function () {
    Storage::disk('local')->put('proofs/approved.png', 'approved');
    $this->registration->update([
        'proof_status' => 'APPROVED',
        'proof_photo_path' => 'proofs/approved.png',
        'proof_uploaded_at' => now()->subHour(),
    ]);

    $this->actingAs($this->student)
        ->post(route('student.registrations.proof.store', $this->registration), ['photo' => proofPhoto()])
        ->assertSessionHasErrors(['proof' => 'Your proof photo has already been approved.']);

    expect($this->registration->refresh()->proof_photo_path)->toBe('proofs/approved.png');
    expect(Storage::disk('local')->allFiles())->toBe(['proofs/approved.png']);
});

test('the student sees their proof status and whether they can upload', function () {
    $this->actingAs($this->student)
        ->get(route('events.show', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.proof_status', 'PENDING')
            ->where('registration.has_proof_photo', false)
            ->where('registration.proof_window', 'open')
            ->where('registration.can_upload_proof', true));
});

test('proof becomes expired once the window closes without a photo', function () {
    $this->travelTo(Carbon::parse('2026-11-21 08:00:00', 'Asia/Manila'));

    $this->actingAs($this->student)
        ->get(route('events.show', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.proof_status', 'EXPIRED')
            ->where('registration.proof_window', 'closed')
            ->where('registration.can_upload_proof', false));

    // Derived only: the stored status is unchanged.
    expect($this->registration->refresh()->proof_status)->toBe('PENDING');
});

test('expiry status follows the approved rules', function (array $state, string $expected) {
    $this->registration->update($state);
    $this->travelTo(Carbon::parse('2026-11-21 08:00:00', 'Asia/Manila'));

    expect($this->registration->refresh()->effectiveProofStatus($this->event))->toBe($expected);
})->with([
    'submitted in time stays reviewable' => [['proof_photo_path' => 'proofs/a.png', 'proof_uploaded_at' => '2026-11-20 11:00:00'], 'PENDING'],
    'rejected and never replaced' => [['proof_status' => 'REJECTED', 'proof_photo_path' => 'proofs/a.png'], 'EXPIRED'],
    'approved stays approved' => [['proof_status' => 'APPROVED', 'proof_photo_path' => 'proofs/a.png'], 'APPROVED'],
]);
