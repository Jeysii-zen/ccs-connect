<?php

use App\Enums\AttendanceStatus;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->faculty = User::factory()->create(['role' => 'faculty']);
    $this->otherFaculty = User::factory()->create(['role' => 'faculty']);
    $this->admin = User::factory()->create(['role' => 'admin']);
});

/**
 * @param  array<string, mixed>  $attributes
 */
function attendanceEvent(User $creator, array $attributes = []): Event
{
    return Event::factory()->for($creator, 'creator')->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => false,
        'proof_upload_start_at' => null,
        'proof_upload_end_at' => null,
        ...$attributes,
    ]);
}

function at(string $time): Carbon
{
    return Carbon::parse("2026-11-20 {$time}", 'Asia/Manila');
}

test('the SQL filter and the badge agree on every combination', function () {
    // A far-off clock: any code path that reads now() instead of the
    // passed $now would disagree with the expectations below.
    $this->travelTo(Carbon::parse('2030-01-01 00:00:00', 'Asia/Manila'));

    $events = [
        'no proof' => attendanceEvent($this->faculty),
        'proof, window 09:00-18:00' => attendanceEvent($this->faculty, [
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20 09:00:00',
            'proof_upload_end_at' => '2026-11-20 18:00:00',
        ]),
        'proof, window 13:00-18:00' => attendanceEvent($this->faculty, [
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20 13:00:00',
            'proof_upload_end_at' => '2026-11-20 18:00:00',
        ]),
        // Window closes before the event ends.
        'proof, window 08:00-11:00' => attendanceEvent($this->faculty, [
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20 08:00:00',
            'proof_upload_end_at' => '2026-11-20 11:00:00',
        ]),
        'proof, no window' => attendanceEvent($this->faculty, ['proof_photo_required' => true]),
    ];

    $combinations = [];

    foreach ([null, 'ATTENDED', 'ABSENT', 'INCOMPLETE'] as $override) {
        foreach ([null, '2026-11-20 09:30:00'] as $checkedIn) {
            // EXPIRED is never stored; it stands in for any unexpected value.
            foreach (['NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'] as $proof) {
                foreach ([null, 'proofs/photo.png'] as $photo) {
                    $combinations[] = compact('override', 'checkedIn', 'proof', 'photo');
                }
            }
        }
    }

    $students = User::factory()->count(count($combinations))->create(['role' => 'student']);
    $rows = [];

    foreach ($events as $event) {
        foreach ($combinations as $i => $c) {
            $rows[] = [
                'event_id' => $event->event_id,
                'user_id' => $students[$i]->id,
                'year_level_at_registration' => '3',
                'block_at_registration' => '2',
                'registered_at' => '2026-11-10 08:00:00',
                'proof_status' => $c['proof'],
                'proof_photo_path' => $c['photo'],
                'proof_uploaded_at' => $c['photo'] ? '2026-11-20 10:00:00' : null,
                'qr_checked_in_at' => $c['checkedIn'],
                'attendance_status' => $c['override'] ?? 'PENDING',
                'attendance_modified_by_user_id' => $c['override'] ? $this->faculty->id : null,
                'attendance_modified_at' => $c['override'] ? '2026-11-20 11:00:00' : null,
            ];
        }
    }

    EventRegistration::insert($rows);

    $moments = ['08:00:00', '09:00:00', '10:00:00', '11:59:59', '12:00:00',
        '13:00:00', '17:59:59', '18:00:00', '18:00:01', '19:00:00'];

    foreach ($events as $label => $event) {
        $registrations = $event->registrations()->get();
        expect($registrations)->toHaveCount(count($combinations));

        foreach ($moments as $moment) {
            $now = at($moment);
            $total = 0;

            foreach (AttendanceStatus::cases() as $status) {
                $fromSql = $event->registrations()
                    ->whereAttendance($event, $status, $now)
                    ->orderBy('registration_id')
                    ->pluck('registration_id')
                    ->all();

                $fromPhp = $registrations
                    ->filter(fn (EventRegistration $r) => $r->effectiveAttendanceStatus($event, $now) === $status->value)
                    ->pluck('registration_id')
                    ->sort()
                    ->values()
                    ->all();

                expect($fromSql)->toBe($fromPhp, "{$label} at {$moment}: {$status->value}");
                $total += count($fromSql);
            }

            // Every registration is in exactly one tab.
            expect($total)->toBe(count($combinations), "{$label} at {$moment}: partition");
        }
    }
});

test('the approved status table holds for the remaining cases', function () {
    $checkedIn = ['qr_checked_in_at' => '2026-11-20 09:30:00'];
    $rejected = EventRegistration::factory()->for(attendanceEvent($this->faculty, [
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]))->create([...$checkedIn, 'proof_status' => 'REJECTED', 'proof_photo_path' => 'proofs/old.png']);
    $lateWindow = EventRegistration::factory()->for(attendanceEvent($this->faculty, [
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 13:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]))->awaitingProof()->create($checkedIn);

    $status = fn (EventRegistration $r, string $time) => $r->effectiveAttendanceStatus($r->event, at($time));

    // Rejected photo: can be replaced while the window is open, then INCOMPLETE.
    expect($status($rejected, '13:00:00'))->toBe('PENDING')
        ->and($status($rejected, '18:00:01'))->toBe('INCOMPLETE')
        // Window still upcoming after the event ends: the photo can still come.
        ->and($status($lateWindow, '12:30:00'))->toBe('PENDING')
        ->and($status($lateWindow, '18:00:01'))->toBe('INCOMPLETE');
});

describe('participants page', function () {
    beforeEach(function () {
        $this->travelTo(at('13:00:00'));

        $this->event = attendanceEvent($this->faculty, [
            'proof_photo_required' => true,
            'proof_upload_start_at' => '2026-11-20 09:00:00',
            'proof_upload_end_at' => '2026-11-20 18:00:00',
        ]);
        $checkedIn = ['qr_checked_in_at' => '2026-11-20 09:30:00'];

        $this->attended = EventRegistration::factory()->for($this->event)->create([...$checkedIn, 'proof_status' => 'APPROVED']);
        $this->absent = EventRegistration::factory()->for($this->event)->awaitingProof()->create();
        $this->pending = EventRegistration::factory()->for($this->event)->awaitingProof()->create($checkedIn);
        $this->overridden = EventRegistration::factory()->for($this->event)->create([
            ...$checkedIn,
            'proof_status' => 'APPROVED',
            'attendance_status' => 'INCOMPLETE',
            'attendance_modified_by_user_id' => $this->faculty->id,
            'attendance_modified_at' => '2026-11-20 12:30:00',
        ]);
    });

    test('filters participants by attendance', function (string $filter, string $expected) {
        $this->actingAs($this->faculty)
            ->get(route('faculty.events.participants.index', [$this->event, 'attendance' => $filter]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentAttendance', $filter)
                ->where('registrations.data', fn ($data) => collect($data)->pluck('registration_id')->all()
                    === [$this->{$expected}->registration_id])
                ->where('registrations.data.0.attendance_status', strtoupper($filter)));
    })->with([
        ['attended', 'attended'],
        ['absent', 'absent'],
        ['pending', 'pending'],
        ['incomplete', 'overridden'],
    ]);

    test('combines with the proof filter and ignores unknown values', function () {
        $this->actingAs($this->faculty)
            ->get(route('faculty.events.participants.index', [$this->event, 'attendance' => 'attended', 'proof' => 'missing']))
            ->assertInertia(fn (Assert $page) => $page->where('registrations.data', []));

        $this->get(route('faculty.events.participants.index', [$this->event, 'attendance' => 'bogus']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentAttendance', 'all')
                ->where('registrations.total', 4));

        $this->get(route('faculty.events.participants.index', $this->event).'?attendance[]=absent')
            ->assertInertia(fn (Assert $page) => $page->where('currentAttendance', 'all'));
    });
});

describe('reset to automatic', function () {
    beforeEach(function () {
        $this->travelTo(at('10:00:00'));

        $this->event = attendanceEvent($this->faculty);
        $this->registration = EventRegistration::factory()->for($this->event)->create([
            'qr_checked_in_at' => '2026-11-20 09:30:00',
            'attendance_status' => 'ABSENT',
            'attended_at' => null,
            'attendance_modified_by_user_id' => $this->admin->id,
            'attendance_modified_at' => '2026-11-20 09:45:00',
        ]);
        $this->url = route('faculty.events.participants.attendance.reset', [$this->event, $this->registration]);
    });

    test('brings back the derived status and keeps the check-in', function () {
        $this->actingAs($this->faculty)
            ->delete($this->url, ['attendance_version' => '2026-11-20 09:45:00'])
            ->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Attendance reset to automatic.');

        $this->registration->refresh();

        expect($this->registration)
            ->attendance_status->toBe('PENDING')
            ->attended_at->toBeNull()
            ->attendance_modified_by_user_id->toBeNull()
            ->attendance_modified_at->toBeNull()
            ->and($this->registration->qr_checked_in_at?->format('Y-m-d H:i:s'))->toBe('2026-11-20 09:30:00')
            ->and($this->registration->effectiveAttendanceStatus($this->event))->toBe('ATTENDED');
    });

    test('brings back the derived status for every override value', function (string $override, ?string $checkedIn, string $derived) {
        $this->registration->update(['attendance_status' => $override, 'qr_checked_in_at' => $checkedIn]);

        $this->actingAs($this->admin)
            ->delete(
                route('admin.events.participants.attendance.reset', [$this->event, $this->registration]),
                ['attendance_version' => '2026-11-20 09:45:00']
            )
            ->assertSessionHasNoErrors();

        expect($this->registration->refresh()->effectiveAttendanceStatus($this->event))->toBe($derived);
    })->with([
        ['ATTENDED', null, 'PENDING'],
        ['ABSENT', '2026-11-20 09:30:00', 'ATTENDED'],
        ['INCOMPLETE', '2026-11-20 09:30:00', 'ATTENDED'],
    ]);

    test('is refused when already automatic', function () {
        $this->registration->update(['attendance_modified_at' => null, 'attendance_modified_by_user_id' => null]);

        $this->actingAs($this->faculty)
            ->delete($this->url, ['attendance_version' => '2026-11-20 09:45:00'])
            ->assertSessionHasErrors(['attendance' => 'Attendance is already set automatically.']);
    });

    test('is refused from a stale page', function () {
        $this->actingAs($this->faculty)
            ->delete($this->url, ['attendance_version' => '2026-11-20 09:40:00'])
            ->assertSessionHasErrors(['attendance' => 'Attendance was changed by someone else. Refresh the page and try again.']);

        expect($this->registration->refresh())
            ->attendance_status->toBe('ABSENT')
            ->attendance_modified_by_user_id->toBe($this->admin->id);
    });

    test('a change from a stale page is refused too', function () {
        // The page was loaded before the admin's override, so it saw no version.
        $this->actingAs($this->faculty)
            ->patch(
                route('faculty.events.participants.attendance.update', [$this->event, $this->registration]),
                ['attendance_status' => 'ATTENDED', 'attendance_version' => null]
            )
            ->assertSessionHasErrors('attendance');

        expect($this->registration->refresh()->attendance_status)->toBe('ABSENT');

        $this->patch(
            route('faculty.events.participants.attendance.update', [$this->event, $this->registration]),
            ['attendance_status' => 'ATTENDED', 'attendance_version' => '2026-11-20 09:45:00']
        )->assertSessionHasNoErrors();

        expect($this->registration->refresh())
            ->attendance_status->toBe('ATTENDED')
            ->attendance_modified_by_user_id->toBe($this->faculty->id);
    });

    test('is refused for the wrong manager, event or payload', function () {
        $payload = ['attendance_version' => '2026-11-20 09:45:00'];

        $this->actingAs($this->otherFaculty)->delete($this->url, $payload)->assertForbidden();
        $this->actingAs($this->registration->student)->delete($this->url, $payload)->assertForbidden();

        $other = attendanceEvent($this->faculty);
        $this->actingAs($this->faculty)
            ->delete(route('faculty.events.participants.attendance.reset', [$other, $this->registration]), $payload)
            ->assertNotFound();

        $this->delete($this->url, [])->assertSessionHasErrors('attendance_version');

        expect($this->registration->refresh()->attendance_modified_at)->not->toBeNull();
    });
});
