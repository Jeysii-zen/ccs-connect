<?php

use App\Models\Event;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    $this->faculty = User::factory()->create(['role' => 'faculty']);
});

test('guests see only upcoming published events', function () {
    $published = Event::factory()->for($this->faculty, 'creator')->published()->create(['title' => 'Open Day']);
    Event::factory()->for($this->faculty, 'creator')->create(['title' => 'Secret Draft']);
    Event::factory()->for($this->faculty, 'creator')->archived()->create(['title' => 'Old Archive']);
    Event::factory()->for($this->faculty, 'creator')->published()->create([
        'title' => 'Last Month',
        'event_date' => '2026-10-01',
        'registration_deadline' => '2026-09-30 17:00:00',
    ]);

    $this->get(route('events.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Index')
            ->has('events.data', 1)
            ->where('events.data.0.event_id', $published->event_id)
            ->where('events.data.0.lifecycle_status', 'Open')
            ->missing('events.data.0.creator')
            ->missing('events.data.0.actions')
        );
});

test('a published event can be viewed publicly', function () {
    $event = Event::factory()->for($this->faculty, 'creator')->published()->create(['title' => 'Open Day']);

    $this->get(route('events.show', $event))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Events/Show')
            ->where('event.title', 'Open Day')
            ->has('event.location.location_name')
            ->has('event.poster_url')
        );
});

test('drafts and archived events are not publicly retrievable', function (string $status) {
    $event = Event::factory()->for($this->faculty, 'creator')->create(['event_status' => $status]);

    $this->get(route('events.show', $event))->assertNotFound();

    // Signed-in students get the same answer.
    $student = User::factory()->create(['role' => 'student']);
    $this->actingAs($student)->get(route('events.show', $event))->assertNotFound();
})->with(['Draft', 'Archived']);

test('the public listing is paginated', function () {
    Event::factory()->count(11)->for($this->faculty, 'creator')->published()->create();

    $this->get(route('events.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('events.data', 9)
            ->where('events.total', 11)
        );
});
