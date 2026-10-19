<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->faculty = User::factory()->create(['role' => 'faculty']);
});

/**
 * An event on 2026-11-20, 09:00–12:00, registration closing 2026-11-18 17:00.
 *
 * @param  array<string, mixed>  $attributes
 */
function scheduledEvent(User $creator, array $attributes = []): Event
{
    return Event::factory()->for($creator, 'creator')->published()->create([
        'event_date' => '2026-11-20',
        'start_time' => '09:00:00',
        'end_time' => '12:00:00',
        'registration_deadline' => '2026-11-18 17:00:00',
        'max_participants' => 50,
        ...$attributes,
    ]);
}

test('published events move through the derived lifecycle phases', function (string $now, string $expected) {
    $event = scheduledEvent($this->faculty);

    $this->travelTo(Carbon::parse($now, 'Asia/Manila'));

    expect($event->lifecycleStatus())->toBe($expected);
})->with([
    'before the deadline' => ['2026-11-10 08:00:00', 'Open'],
    'at the deadline' => ['2026-11-18 17:00:00', 'Open'],
    'after the deadline' => ['2026-11-18 17:01:00', 'Closed'],
    'when it starts' => ['2026-11-20 09:00:00', 'Ongoing'],
    'during the event' => ['2026-11-20 11:59:00', 'Ongoing'],
    'when it ends' => ['2026-11-20 12:00:00', 'Completed'],
    'days later' => ['2026-12-01 08:00:00', 'Completed'],
]);

test('a published event is full once capacity is reached', function () {
    $this->travelTo(Carbon::parse('2026-11-10 08:00:00', 'Asia/Manila'));

    $event = scheduledEvent($this->faculty);

    expect($event->lifecycleStatus(49))->toBe('Open')
        ->and($event->lifecycleStatus(50))->toBe('Full');
});

test('draft and archived events keep their stored status', function () {
    $this->travelTo(Carbon::parse('2026-12-01 08:00:00', 'Asia/Manila'));

    expect(scheduledEvent($this->faculty, ['event_status' => 'Draft'])->lifecycleStatus())->toBe('Draft')
        ->and(scheduledEvent($this->faculty, ['event_status' => 'Archived'])->lifecycleStatus())->toBe('Archived');
});

test('drafts can be published and published events archived', function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    $event = scheduledEvent($this->faculty, ['event_status' => 'Draft']);

    $this->actingAs($this->faculty)
        ->patch(route('faculty.events.publish', $event))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Event published successfully.');

    expect($event->refresh()->event_status)->toBe('Published');

    $this->actingAs($this->faculty)
        ->patch(route('faculty.events.archive', $event))
        ->assertSessionHasNoErrors()
        ->assertSessionHas('success', 'Event archived successfully.');

    expect($event->refresh()->event_status)->toBe('Archived');
});

test('invalid lifecycle transitions are rejected', function (string $status, string $action) {
    $event = scheduledEvent($this->faculty, ['event_status' => $status]);

    $this->actingAs($this->faculty)
        ->patch(route("faculty.events.{$action}", $event))
        ->assertSessionHasErrors('event');

    expect($event->refresh()->event_status)->toBe($status);
})->with([
    'publish a published event' => ['Published', 'publish'],
    'publish an archived event' => ['Archived', 'publish'],
    'archive a draft' => ['Draft', 'archive'],
    'archive an archived event' => ['Archived', 'archive'],
]);

test('the listing exposes the lifecycle label and allowed actions', function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    scheduledEvent($this->faculty, ['event_status' => 'Archived']);

    $this->actingAs($this->faculty)
        ->get(route('faculty.events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('events.data.0.lifecycle_status', 'Archived')
            ->where('events.data.0.actions', [
                'edit' => false,
                'publish' => false,
                'archive' => false,
                'delete' => true,
            ])
        );
});
