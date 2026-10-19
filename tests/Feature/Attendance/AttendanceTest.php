<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use App\Services\AttendanceService;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-20 10:00:00', 'Asia/Manila'));

    $this->faculty = User::factory()->create(['role' => 'faculty']);
    $this->otherFaculty = User::factory()->create(['role' => 'faculty']);
    $this->admin = User::factory()->create(['role' => 'admin']);

    $this->event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => false,
        'proof_upload_start_at' => null,
        'proof_upload_end_at' => null,
    ]);

    $this->registration = EventRegistration::factory()->for($this->event)->create();
    $this->student = $this->registration->student;
});

function checkInCode(Event $event): string
{
    return app(AttendanceService::class)->currentCode($event);
}

function checkIn(Event $event, string $code)
{
    return test()->post(route('student.check-in.store', $event), ['code' => $code]);
}

test('a registered student checks in with the code on screen', function () {
    $this->actingAs($this->student);

    checkIn($this->event, checkInCode($this->event))
        ->assertRedirect(route('student.registrations.index'))
        ->assertSessionHas('success', "You are checked in to {$this->event->title}.");

    expect($this->registration->refresh()->qr_checked_in_at?->format('Y-m-d H:i'))->toBe('2026-11-20 10:00');
});

test('scanning again keeps the first check-in time', function () {
    $this->actingAs($this->student);
    checkIn($this->event, checkInCode($this->event));

    $this->travel(5)->minutes();

    checkIn($this->event, checkInCode($this->event))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', "You are already checked in to {$this->event->title}.");

    expect($this->registration->refresh()->qr_checked_in_at?->format('H:i'))->toBe('10:00');
});

test('a code works until the slice after next begins', function () {
    // 10:00:00 starts a 15-second slice: the code is valid for 10:00:00–10:00:29.
    $code = checkInCode($this->event);
    $late = EventRegistration::factory()->for($this->event)->create();

    $this->travelTo(Carbon::parse('2026-11-20 10:00:30', 'Asia/Manila'));
    $this->actingAs($late->student);
    checkIn($this->event, $code)->assertSessionHasErrors('attendance');
    expect($late->refresh()->qr_checked_in_at)->toBeNull();

    $this->travelTo(Carbon::parse('2026-11-20 10:00:29', 'Asia/Manila'));
    $this->actingAs($this->student);
    checkIn($this->event, $code)->assertSessionHasNoErrors();
    expect($this->registration->refresh()->qr_checked_in_at)->not->toBeNull();
});

test('a code from another event or a made-up code is rejected', function () {
    $other = Event::factory()->for($this->faculty, 'creator')->published()->create();
    $this->actingAs($this->student);

    checkIn($this->event, checkInCode($other))->assertSessionHasErrors('attendance');
    checkIn($this->event, 'not-a-real-code')->assertSessionHasErrors('attendance');
    checkIn($this->event, '')->assertSessionHasErrors('attendance');
    $this->post(route('student.check-in.store', $this->event), ['code' => ['x']])
        ->assertSessionHasErrors('attendance');

    expect($this->registration->refresh()->qr_checked_in_at)->toBeNull();
});

test('check-in is only open while the event is ongoing', function (string $time) {
    $this->travelTo(Carbon::parse("2026-11-20 {$time}", 'Asia/Manila'));
    $this->actingAs($this->student);

    checkIn($this->event, checkInCode($this->event))
        ->assertSessionHasErrors(['attendance' => 'Check-in is only open while the event is ongoing.']);

    expect($this->registration->refresh()->qr_checked_in_at)->toBeNull();
})->with(['before the start' => '08:59:00', 'at the end' => '12:00:00']);

test('a student who did not register cannot check in', function () {
    $stranger = User::factory()->create(['role' => 'student']);

    $this->actingAs($stranger);
    checkIn($this->event, checkInCode($this->event))
        ->assertSessionHasErrors(['attendance' => 'You are not registered for this event.']);

    expect($this->event->registrations()->whereNotNull('qr_checked_in_at')->count())->toBe(0);
});

test('only students can check in, and only to published events', function () {
    $this->actingAs($this->faculty);
    checkIn($this->event, checkInCode($this->event))->assertForbidden();

    auth()->logout();
    checkIn($this->event, checkInCode($this->event))->assertRedirect(route('login'));

    $draft = Event::factory()->for($this->faculty, 'creator')->create();
    $this->actingAs($this->student);
    checkIn($draft, checkInCode($draft))->assertNotFound();
});

test('the QR link opens a confirmation page and changes nothing', function () {
    $this->actingAs($this->student)
        ->get(route('student.check-in.show', [$this->event, 'code' => 'abc']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/CheckIn')
            ->where('code', 'abc')
            ->where('registered', true)
            ->where('checkedInAt', null));

    expect($this->registration->refresh()->qr_checked_in_at)->toBeNull();
});

test('attendance is derived from the check-in and the proof photo', function () {
    $proofEvent = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]);
    $checkedIn = ['qr_checked_in_at' => '2026-11-20 09:30:00'];

    $noProofIn = EventRegistration::factory()->for($this->event)->create($checkedIn);
    $noProofOut = $this->registration;
    $approved = EventRegistration::factory()->for($proofEvent)->create([...$checkedIn, 'proof_status' => 'APPROVED']);
    $noPhoto = EventRegistration::factory()->for($proofEvent)->awaitingProof()->create($checkedIn);
    $inReview = EventRegistration::factory()->for($proofEvent)->submitted()->create($checkedIn);
    $proofNoQr = EventRegistration::factory()->for($proofEvent)->create(['proof_status' => 'APPROVED']);

    $status = fn (EventRegistration $registration) => $registration->refresh()
        ->effectiveAttendanceStatus($registration->event);

    // During the event.
    expect($status($noProofIn))->toBe('ATTENDED')
        ->and($status($noProofOut))->toBe('PENDING')
        ->and($status($approved))->toBe('ATTENDED')
        ->and($status($noPhoto))->toBe('PENDING');

    // After the event, proof window still open.
    $this->travelTo(Carbon::parse('2026-11-20 13:00:00', 'Asia/Manila'));
    expect($status($noProofOut))->toBe('ABSENT')
        ->and($status($noPhoto))->toBe('PENDING')
        ->and($status($proofNoQr))->toBe('ABSENT');

    // Proof window closed.
    $this->travelTo(Carbon::parse('2026-11-20 19:00:00', 'Asia/Manila'));
    expect($status($noPhoto))->toBe('INCOMPLETE')
        ->and($status($inReview))->toBe('PENDING')
        ->and($status($approved))->toBe('ATTENDED');
});

test('the event owner sees a rotating QR code while the event is ongoing', function () {
    $this->registration->update(['qr_checked_in_at' => now()]);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.check-in', $this->event))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Manage/CheckIn')
            ->where('checkInOpen', true)
            ->where('checkedInCount', 1)
            ->where('qrSvg', fn (string $svg) => str_starts_with($svg, '<svg')));

    $this->travelTo(Carbon::parse('2026-11-20 12:00:00', 'Asia/Manila'));

    $this->get(route('faculty.events.check-in', $this->event))
        ->assertInertia(fn (Assert $page) => $page->where('checkInOpen', false)->where('qrSvg', null));
});

test('only the event managers can open the QR screen', function () {
    $this->actingAs($this->otherFaculty)->get(route('faculty.events.check-in', $this->event))->assertForbidden();
    $this->actingAs($this->student)->get(route('faculty.events.check-in', $this->event))->assertForbidden();
    $this->actingAs($this->admin)->get(route('admin.events.check-in', $this->event))->assertOk();
});

test('the event owner can change attendance, overriding the check-in', function () {
    $this->registration->update(['qr_checked_in_at' => now()]);

    $this->actingAs($this->faculty)
        ->patch(
            route('faculty.events.participants.attendance.update', [$this->event, $this->registration]),
            ['attendance_status' => 'ABSENT', 'attendance_version' => null]
        )
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Attendance updated.');

    $this->registration->refresh();

    expect($this->registration)
        ->attendance_status->toBe('ABSENT')
        ->attendance_modified_by_user_id->toBe($this->faculty->id)
        ->attended_at->toBeNull()
        ->and($this->registration->effectiveAttendanceStatus($this->event))->toBe('ABSENT');
});

test('admin can mark any participant as attended', function () {
    $this->actingAs($this->admin)
        ->patch(
            route('admin.events.participants.attendance.update', [$this->event, $this->registration]),
            ['attendance_status' => 'ATTENDED', 'attendance_version' => null]
        )
        ->assertSessionHasNoErrors();

    expect($this->registration->refresh())
        ->attendance_status->toBe('ATTENDED')
        ->attended_at->not->toBeNull();
});

test('attendance changes are refused for the wrong manager, value, event or time', function () {
    $url = route('faculty.events.participants.attendance.update', [$this->event, $this->registration]);

    $this->actingAs($this->otherFaculty)->patch($url, ['attendance_status' => 'ATTENDED', 'attendance_version' => null])->assertForbidden();
    $this->actingAs($this->student)->patch($url, ['attendance_status' => 'ATTENDED', 'attendance_version' => null])->assertForbidden();

    $this->actingAs($this->faculty)->patch($url, ['attendance_status' => 'PENDING', 'attendance_version' => null])
        ->assertSessionHasErrors('attendance_status');

    $other = Event::factory()->for($this->faculty, 'creator')->published()->create();
    $this->patch(route('faculty.events.participants.attendance.update', [$other, $this->registration]), [
        'attendance_status' => 'ATTENDED',
        'attendance_version' => null,
    ])->assertNotFound();

    $this->travelTo(Carbon::parse('2026-11-20 08:00:00', 'Asia/Manila'));
    $this->patch($url, ['attendance_status' => 'ATTENDED', 'attendance_version' => null])
        ->assertSessionHasErrors(['attendance' => 'Attendance can be changed once the event starts.']);

    expect($this->registration->refresh()->attendance_modified_at)->toBeNull();
});

test('participants and my events show the attendance status', function () {
    $this->registration->update(['qr_checked_in_at' => now()]);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.participants.index', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canModifyAttendance', true)
            ->where('registrations.data.0.attendance_status', 'ATTENDED')
            ->where('registrations.data.0.checked_in_at', '2026-11-20T10:00'));

    $this->actingAs($this->student)
        ->get(route('student.registrations.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registrations.data.0.registration.attendance_status', 'ATTENDED'));
});

test('check-in is open from the first second to the last', function (string $time) {
    $this->travelTo(Carbon::parse("2026-11-20 {$time}", 'Asia/Manila'));
    $this->actingAs($this->student);

    checkIn($this->event, checkInCode($this->event))->assertSessionHasNoErrors();

    expect($this->registration->refresh()->qr_checked_in_at)->not->toBeNull();
})->with(['at the start' => '09:00:00', 'last second' => '11:59:59']);

test('the QR link checks the student in end to end', function () {
    $url = app(AttendanceService::class)->checkInUrl($this->event);
    $code = checkInCode($this->event);

    $this->actingAs($this->student)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('code', $code)->where('checkInOpen', true));

    checkIn($this->event, $code)
        ->assertSessionHas('success', "You are checked in to {$this->event->title}.");
});

test('the check-in page says when check-in is closed', function () {
    $this->travelTo(Carbon::parse('2026-11-20 08:00:00', 'Asia/Manila'));

    $this->actingAs($this->student)
        ->get(route('student.check-in.show', [$this->event, 'code' => 'abc']))
        ->assertInertia(fn (Assert $page) => $page->where('checkInOpen', false));
});

test('check-in ignores a user_id sent with the request', function () {
    $other = EventRegistration::factory()->for($this->event)->create();

    $this->actingAs($this->student)
        ->post(route('student.check-in.store', $this->event), [
            'code' => checkInCode($this->event),
            'user_id' => $other->user_id,
        ])
        ->assertSessionHasNoErrors();

    expect($this->registration->refresh()->qr_checked_in_at)->not->toBeNull()
        ->and($other->refresh()->qr_checked_in_at)->toBeNull();
});

test('managers cannot use the other role\'s routes', function () {
    $update = ['attendance_status' => 'ATTENDED', 'attendance_version' => null];

    $this->actingAs($this->admin)->get(route('faculty.events.check-in', $this->event))->assertForbidden();
    $this->actingAs($this->admin)
        ->patch(route('faculty.events.participants.attendance.update', [$this->event, $this->registration]), $update)
        ->assertForbidden();
    $this->actingAs($this->faculty)->get(route('admin.events.check-in', $this->event))->assertForbidden();
    $this->actingAs($this->faculty)
        ->delete(route('admin.events.participants.attendance.reset', [$this->event, $this->registration]), [
            'attendance_version' => '2026-11-20 09:45:00',
        ])
        ->assertForbidden();

    expect($this->registration->refresh()->attendance_modified_at)->toBeNull();
});

test('guests are sent to login from check-in and attendance routes', function () {
    $this->get(route('student.check-in.show', [$this->event, 'code' => 'abc']))->assertRedirect(route('login'));
    $this->patch(route('faculty.events.participants.attendance.update', [$this->event, $this->registration]), [
        'attendance_status' => 'ATTENDED',
        'attendance_version' => null,
    ])->assertRedirect(route('login'));
    $this->delete(route('faculty.events.participants.attendance.reset', [$this->event, $this->registration]), [
        'attendance_version' => '2026-11-20 09:45:00',
    ])->assertRedirect(route('login'));
    $this->get(route('faculty.events.check-in', $this->event))->assertRedirect(route('login'));

    expect($this->registration->refresh())
        ->attendance_modified_at->toBeNull()
        ->qr_checked_in_at->toBeNull();
});

test('deactivated accounts cannot check in or change attendance', function () {
    $this->student->update(['account_status' => 'DEACTIVATED']);
    $this->actingAs($this->student);
    checkIn($this->event, checkInCode($this->event))->assertRedirect(route('login'));
    $this->assertGuest();

    $this->faculty->update(['account_status' => 'DEACTIVATED']);
    $this->actingAs($this->faculty)
        ->patch(route('faculty.events.participants.attendance.update', [$this->event, $this->registration]), [
            'attendance_status' => 'ATTENDED',
            'attendance_version' => null,
        ])
        ->assertRedirect(route('login'));

    expect($this->registration->refresh())
        ->qr_checked_in_at->toBeNull()
        ->attendance_modified_at->toBeNull();
});

test('a student who must change their password cannot check in yet', function () {
    $this->student->update(['must_change_password' => true]);

    $this->actingAs($this->student);
    checkIn($this->event, checkInCode($this->event))->assertRedirect(route('password.first-login.edit'));

    expect($this->registration->refresh()->qr_checked_in_at)->toBeNull();
});

test('the attendance version from the participants page is accepted', function () {
    $url = route('faculty.events.participants.attendance.update', [$this->event, $this->registration]);
    $version = fn () => $this->get(route('faculty.events.participants.index', $this->event))
        ->viewData('page')['props']['registrations']['data'][0]['attendance_version'];

    $this->actingAs($this->faculty)
        ->patch($url, ['attendance_status' => 'ABSENT', 'attendance_version' => $version()])
        ->assertSessionHasNoErrors();

    $this->travel(1)->seconds();
    $this->patch($url, ['attendance_status' => 'INCOMPLETE', 'attendance_version' => $version()])
        ->assertSessionHasNoErrors();

    $this->delete(
        route('faculty.events.participants.attendance.reset', [$this->event, $this->registration]),
        ['attendance_version' => $version()]
    )->assertSessionHasNoErrors();

    expect($this->registration->refresh()->attendance_modified_at)->toBeNull();
});

test('archived events have no check-in', function () {
    $this->event->update(['event_status' => 'Archived']);
    $this->actingAs($this->student);

    $this->get(route('student.check-in.show', [$this->event, 'code' => 'abc']))->assertNotFound();
    checkIn($this->event, checkInCode($this->event))->assertNotFound();
});

test('archiving an event freezes its attendance and proof review', function () {
    $this->registration->update([
        'proof_status' => 'PENDING',
        'proof_photo_path' => 'proofs/photo.png',
        'proof_uploaded_at' => '2026-11-20 09:30:00',
        'attendance_status' => 'ABSENT',
        'attendance_modified_by_user_id' => $this->faculty->id,
        'attendance_modified_at' => '2026-11-20 09:45:00',
    ]);
    $this->event->update(['event_status' => 'Archived']);
    $this->actingAs($this->faculty);

    $this->patch(route('faculty.events.participants.attendance.update', [$this->event, $this->registration]), [
        'attendance_status' => 'ATTENDED',
        'attendance_version' => '2026-11-20 09:45:00',
    ])->assertSessionHasErrors(['attendance' => 'This event is archived, so its attendance can no longer be changed.']);

    $this->delete(route('faculty.events.participants.attendance.reset', [$this->event, $this->registration]), [
        'attendance_version' => '2026-11-20 09:45:00',
    ])->assertSessionHasErrors('attendance');

    $this->patch(route('faculty.events.participants.proof.review', [$this->event, $this->registration]), [
        'decision' => 'approve',
        'proof_version' => '2026-11-20 09:30:00',
    ])->assertSessionHasErrors(['proof' => 'This event is archived, so its proof photos can no longer be reviewed.']);

    $this->get(route('faculty.events.participants.index', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canModifyAttendance', false)
            ->where('canReviewProof', false));

    expect($this->registration->refresh())
        ->attendance_status->toBe('ABSENT')
        ->proof_status->toBe('PENDING');
});

test('the QR screen lists the latest check-ins of this event and polls only live data', function () {
    $this->registration->update(['qr_checked_in_at' => '2026-11-20 09:40:00']);
    EventRegistration::factory()->for($this->event)->create(); // not checked in
    $elsewhere = Event::factory()->for($this->faculty, 'creator')->published()->create();
    EventRegistration::factory()->for($elsewhere)->create(['qr_checked_in_at' => '2026-11-20 09:50:00']);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.check-in', $this->event))
        ->assertInertia(fn (Assert $page) => $page
            ->where('checkedInCount', 1)
            ->where('lifecycleStatus', 'Ongoing')
            ->has('recentCheckIns', 1)
            ->where('recentCheckIns.0.name', trim("{$this->student->first_name} {$this->student->last_name}"))
            ->where('recentCheckIns.0.checked_in_at', '09:40')
            ->missing('recentCheckIns.0.student_number')
            ->reloadOnly(['qrSvg', 'checkedInCount', 'recentCheckIns', 'lifecycleStatus', 'checkInOpen'], fn (Assert $reload) => $reload
                ->missing('event')
                ->missing('routePrefix')));
});
