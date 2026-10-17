<?php

use App\Models\Announcement;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'must_change_password' => false,
    ]);
});

test('it publishes announcements whose scheduled time has arrived', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Announcement Ready to Publish',
        'description_content' => 'This announcement is due.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Scheduled',
        'published_at' => null,
        'scheduled_at' => now()->subMinute(),
    ]);

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 1 scheduled announcement(s).')
        ->assertSuccessful();

    $announcement->refresh();

    expect($announcement->announcement_status)->toBe('Published')
        ->and($announcement->published_at)->not->toBeNull()
        ->and($announcement->scheduled_at)->toBeNull();
});

test('it leaves future announcements scheduled', function () {
    $futureTime = now()->addDay();

    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Future Announcement',
        'description_content' => 'This announcement is not due yet.',
        'announcement_date' => $futureTime->toDateString(),
        'announcement_status' => 'Scheduled',
        'published_at' => null,
        'scheduled_at' => $futureTime,
    ]);

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 0 scheduled announcement(s).')
        ->assertSuccessful();

    $announcement->refresh();

    expect($announcement->announcement_status)->toBe('Scheduled')
        ->and($announcement->published_at)->toBeNull()
        ->and($announcement->scheduled_at->toDateTimeString())
        ->toBe($futureTime->toDateTimeString());
});

test('it does not republish announcements already published', function () {
    $publishedAt = now()->subDay();

    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Already Published Announcement',
        'description_content' => 'This was already published.',
        'announcement_date' => $publishedAt->toDateString(),
        'announcement_status' => 'Published',
        'published_at' => $publishedAt,
        'scheduled_at' => null,
    ]);

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 0 scheduled announcement(s).')
        ->assertSuccessful();

    $announcement->refresh();

    expect($announcement->announcement_status)->toBe('Published')
        ->and($announcement->published_at->toDateTimeString())
        ->toBe($publishedAt->toDateTimeString());
});

test('it never publishes drafts, even with a past scheduled time', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Draft With Old Schedule',
        'description_content' => 'Drafts are published by hand only.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => now()->subHour(),
    ]);

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 0 scheduled announcement(s).')
        ->assertSuccessful();

    expect($announcement->refresh()->announcement_status)->toBe('Draft')
        ->and($announcement->published_at)->toBeNull();
});

test('running the publisher twice publishes each announcement once', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Due Once',
        'description_content' => 'Second run must not touch it.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Scheduled',
        'published_at' => null,
        'scheduled_at' => now()->subMinute(),
    ]);

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 1 scheduled announcement(s).');

    $firstPublishedAt = $announcement->refresh()->published_at->toDateTimeString();

    $this->travel(5)->minutes();

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput('Published 0 scheduled announcement(s).');

    expect($announcement->refresh()->published_at->toDateTimeString())
        ->toBe($firstPublishedAt);
});

test('a failure on one announcement does not stop the others', function () {
    $failing = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Fails To Publish',
        'description_content' => 'Simulated failure.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Scheduled',
        'published_at' => null,
        'scheduled_at' => now()->subMinutes(2),
    ]);

    $healthy = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Publishes Fine',
        'description_content' => 'Should still be published.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Scheduled',
        'published_at' => null,
        'scheduled_at' => now()->subMinute(),
    ]);

    Announcement::updating(function (Announcement $announcement) use ($failing) {
        if ($announcement->announcement_id === $failing->announcement_id) {
            throw new RuntimeException('Simulated publish failure.');
        }
    });

    $this->artisan('announcements:publish-scheduled')
        ->expectsOutput("Failed to publish announcement #{$failing->announcement_id}.")
        ->expectsOutput('Published 1 scheduled announcement(s).')
        ->assertFailed();

    expect($failing->refresh()->announcement_status)->toBe('Scheduled')
        ->and($failing->published_at)->toBeNull()
        ->and($healthy->refresh()->announcement_status)->toBe('Published');
});
