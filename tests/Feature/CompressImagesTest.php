<?php

use App\Models\Announcement;
use App\Models\AnnouncementImage;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

/**
 * An ~8 MB photo-like PNG (random pixels scaled up), built once per run.
 */
function bigPng(): string
{
    static $png = null;

    if ($png === null) {
        $small = imagecreatetruecolor(260, 180);

        for ($y = 0; $y < 180; $y++) {
            for ($x = 0; $x < 260; $x++) {
                imagesetpixel($small, $x, $y, random_int(0, 0xFFFFFF));
            }
        }

        ob_start();
        imagepng(imagescale($small, 2600, 1800, IMG_BICUBIC));
        $png = (string) ob_get_clean();
    }

    return $png;
}

beforeEach(function () {
    Storage::fake('public');
    Storage::fake('local');

    $this->png = bigPng();
    $admin = User::factory()->create(['role' => 'admin']);

    Storage::disk('public')->put('announcements/a.png', $this->png);
    $announcement = Announcement::create([
        'created_by_user_id' => $admin->id,
        'title' => 'With image',
        'description_content' => 'Body.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
    ]);
    $this->image = AnnouncementImage::create(['announcement_id' => $announcement->announcement_id, 'image_path' => 'announcements/a.png']);

    // One poster shared by two events.
    Storage::disk('public')->put('events/poster.png', $this->png);
    $this->events = Event::factory()->count(2)->create(['poster_path' => 'events/poster.png']);

    Storage::disk('public')->put('profiles/me.png', $this->png);
    $this->user = User::factory()->create(['profile_picture_path' => 'profiles/me.png']);

    Storage::disk('local')->put('proofs/1/selfie.png', $this->png);
    $this->registration = EventRegistration::factory()->create(['proof_photo_path' => 'proofs/1/selfie.png']);

    // Left alone: not an image, missing, already WebP.
    Storage::disk('public')->put('announcements/notes.png', 'plain text');
    $this->notImage = AnnouncementImage::create(['announcement_id' => $announcement->announcement_id, 'image_path' => 'announcements/notes.png']);
    $this->missing = AnnouncementImage::create(['announcement_id' => $announcement->announcement_id, 'image_path' => 'announcements/gone.png']);
    Storage::disk('public')->put('announcements/done.webp', 'already webp');
    $this->done = AnnouncementImage::create(['announcement_id' => $announcement->announcement_id, 'image_path' => 'announcements/done.webp']);
});

test('a dry run changes nothing', function () {
    $this->artisan('images:compress', ['--dry-run' => true])
        ->expectsOutputToContain('Would convert 4 image(s)')
        ->assertSuccessful();

    expect($this->image->refresh()->image_path)->toBe('announcements/a.png');
    Storage::disk('public')->assertExists('announcements/a.png');
    expect(Storage::disk('local')->allFiles('image-backups'))->toBe([]);
});

test('existing images are converted, re-pointed and backed up', function () {
    $this->artisan('images:compress')
        ->expectsOutputToContain('Converted 4 image(s)')
        ->assertSuccessful();

    $public = Storage::disk('public');
    $local = Storage::disk('local');

    expect($this->image->refresh()->image_path)->toBe('announcements/a.webp')
        ->and($this->events->map(fn (Event $event) => $event->refresh()->poster_path)->all())
        ->toBe(['events/poster.webp', 'events/poster.webp'])
        ->and($this->user->refresh()->profile_picture_path)->toBe('profiles/me.webp')
        ->and($this->registration->refresh()->proof_photo_path)->toBe('proofs/1/selfie.webp');

    foreach (['announcements/a', 'events/poster', 'profiles/me'] as $base) {
        $public->assertExists("{$base}.webp");
        $public->assertMissing("{$base}.png");
        expect($local->get("image-backups/public/{$base}.png"))->toBe($this->png);
    }

    // Proof photos stay on the private disk.
    $local->assertExists('proofs/1/selfie.webp');
    $local->assertMissing('proofs/1/selfie.png');
    $public->assertMissing('proofs/1/selfie.webp');
    expect($local->get('image-backups/local/proofs/1/selfie.png'))->toBe($this->png)
        ->and(strlen($public->get('announcements/a.webp')))->toBeLessThan(strlen($this->png))
        ->and(getimagesizefromstring($public->get('announcements/a.webp'))[0])->toBe(1920);

    // Skipped rows are untouched.
    expect($this->notImage->refresh()->image_path)->toBe('announcements/notes.png')
        ->and($this->missing->refresh()->image_path)->toBe('announcements/gone.png')
        ->and($this->done->refresh()->image_path)->toBe('announcements/done.webp');
    $public->assertExists('announcements/notes.png');
});

test('running it again finds nothing to do', function () {
    $this->artisan('images:compress')->assertSuccessful();

    $this->artisan('images:compress')
        ->expectsOutputToContain('Converted 0 image(s)')
        ->assertSuccessful();
});
