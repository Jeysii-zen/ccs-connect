<?php

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Carbon;

beforeEach(function () {
    $this->faculty = User::factory()->create(['role' => 'faculty']);
    $this->admin = User::factory()->create(['role' => 'admin']);

    // After the event ended and its proof window closed.
    $this->travelTo(Carbon::parse('2026-11-21 08:00:00', 'Asia/Manila'));

    $this->event = Event::factory()->for($this->faculty, 'creator')->published()->create([
        'title' => 'Hackathon Kickoff',
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'proof_photo_required' => true,
        'proof_upload_start_at' => '2026-11-20 09:00:00',
        'proof_upload_end_at' => '2026-11-20 18:00:00',
    ]);

    $register = fn (string $year, string $block, array $attributes) => EventRegistration::factory()
        ->for($this->event)
        ->create([
            'year_level_at_registration' => $year,
            'block_at_registration' => $block,
            'proof_status' => 'PENDING',
            ...$attributes,
        ]);

    // Attended: checked in + approved proof. attended_at is never set, so
    // the report must use the derived status.
    $register('3', '2', ['qr_checked_in_at' => '2026-11-20 09:30:00', 'proof_status' => 'APPROVED', 'proof_photo_path' => 'proofs/a.png']);
    // Absent: never checked in.
    $register('3', '2', []);
    // Incomplete: checked in, proof rejected after the window closed.
    $register('3', '1', ['qr_checked_in_at' => '2026-11-20 09:40:00', 'proof_status' => 'REJECTED', 'proof_photo_path' => 'proofs/b.png']);
    // Manually marked attended by the faculty, overriding the rules.
    $register('2', '1', [
        'attendance_status' => 'ATTENDED',
        'attendance_modified_by_user_id' => $this->faculty->id,
        'attendance_modified_at' => '2026-11-20 13:00:00',
    ]);
});

test('the report reads the derived attendance and groups by year and section', function () {
    $this->actingAs($this->faculty)
        ->get(route('faculty.events.report', [$this->event, 'preview']))
        ->assertOk()
        ->assertViewHas('totals', [
            'registered' => 4,
            'attended' => 2,
            'absent' => 1,
            'pending' => 0,
            'incomplete' => 1,
        ])
        ->assertViewHas('proof', ['submitted' => 2, 'approved' => 1, 'rejected' => 1])
        ->assertViewHas('attendance_rate', 50.0)
        ->assertViewHas('groups', [
            ['year' => '2', 'block' => '1', 'registered' => 1, 'attended' => 1, 'absent' => 0],
            ['year' => '3', 'block' => '1', 'registered' => 1, 'attended' => 0, 'absent' => 0],
            ['year' => '3', 'block' => '2', 'registered' => 2, 'attended' => 1, 'absent' => 1],
        ])
        ->assertSeeText('Hackathon Kickoff')
        ->assertSeeText('50%');
});

test('an event without registrations has no attendance rate', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->published()->create(['proof_photo_required' => false]);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.report', [$event, 'preview']))
        ->assertOk()
        ->assertViewHas('attendance_rate', null)
        ->assertViewHas('proof', null)
        ->assertSeeText('No students have registered.');
});

test('the report exports as PDF and Excel', function () {
    $this->actingAs($this->faculty);

    $pdf = $this->get(route('faculty.events.report', [$this->event, 'pdf']))->assertOk();
    expect($pdf->headers->get('content-type'))->toBe('application/pdf')
        ->and($pdf->headers->get('content-disposition'))->toContain('participation-report-'.$this->event->event_id.'-hackathon-kickoff.pdf');

    $xlsx = $this->get(route('faculty.events.report', [$this->event, 'xlsx']))->assertOk();
    expect($xlsx->headers->get('content-type'))->toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        ->and($xlsx->headers->get('content-disposition'))->toContain('.xlsx');
});

test('faculty can only report on their own events; admin on any', function () {
    $other = User::factory()->create(['role' => 'faculty']);
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($other)
        ->get(route('faculty.events.report', [$this->event, 'pdf']))
        ->assertForbidden();

    $this->actingAs($student)
        ->get(route('faculty.events.report', [$this->event, 'preview']))
        ->assertForbidden();

    $this->actingAs($this->admin)
        ->get(route('admin.events.report', [$this->event, 'preview']))
        ->assertOk();
});

test('guests are sent to login and unknown formats are not found', function () {
    $this->get(route('admin.events.report', [$this->event, 'preview']))
        ->assertRedirect(route('login'));

    $this->actingAs($this->admin)
        ->get("/admin/events/{$this->event->event_id}/report/csv")
        ->assertNotFound();
});
