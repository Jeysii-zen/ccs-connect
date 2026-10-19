<?php

use App\Models\Announcement;
use App\Models\AnnouncementImage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = User::factory()->create([
        'role' => 'admin',
        'must_change_password' => false,
    ]);

    $this->student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => false,
    ]);
});

test('admin can view the announcements page', function () {
    $response = $this->actingAs($this->admin)
        ->get(route('admin.announcements.index'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Announcements/Index')
            ->has('announcements')
            ->where('currentView', 'announcements')
            ->has('announcementCounts')
        );
});

test('non-admin users cannot access announcement management', function () {
    $response = $this->actingAs($this->student)
        ->get(route('admin.announcements.index'));

    $response->assertForbidden();
});

test('guest users cannot access announcement management', function () {
    $response = $this->get(route('admin.announcements.index'));

    $response->assertRedirect();
});

test('admin can create a draft announcement', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Campus Maintenance Notice',
            'description_content' => 'The campus network will undergo maintenance.',
            'announcement_status' => 'Draft',
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'drafts']))
        ->assertSessionHas('success', 'Announcement saved as draft successfully.');

    $announcement = Announcement::query()
        ->where('title', 'Campus Maintenance Notice')
        ->first();

    expect($announcement)->not->toBeNull()
        ->and($announcement->created_by_user_id)->toBe($this->admin->id)
        ->and($announcement->description_content)
        ->toBe('The campus network will undergo maintenance.')
        ->and($announcement->announcement_status)->toBe('Draft')
        ->and($announcement->published_at)->toBeNull()
        ->and($announcement->scheduled_at)->toBeNull()
        ->and($announcement->announcement_date->toDateString())
        ->toBe(now()->toDateString());
});

test('admin can publish an announcement immediately', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Enrollment Announcement',
            'description_content' => 'Enrollment information is now available.',
            'announcement_status' => 'Published',
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'announcements']));

    $announcement = Announcement::query()
        ->where('title', 'Enrollment Announcement')
        ->firstOrFail();

    expect($announcement->announcement_status)->toBe('Published')
        ->and($announcement->published_at)->not->toBeNull()
        ->and($announcement->scheduled_at)->toBeNull();
});

test('admin can schedule an announcement for a future date', function () {
    $scheduledAt = now()->addDays(2)->startOfHour();

    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Upcoming CCS Event',
            'description_content' => 'A CCS event will be held soon.',
            'announcement_status' => 'Scheduled',
            'scheduled_at' => $scheduledAt->toDateTimeString(),
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'schedule']))
        ->assertSessionHas('success', 'Announcement scheduled successfully.');

    $announcement = Announcement::query()
        ->where('title', 'Upcoming CCS Event')
        ->firstOrFail();

    expect($announcement->announcement_status)->toBe('Scheduled')
        ->and($announcement->published_at)->toBeNull()
        ->and($announcement->scheduled_at->toDateTimeString())
        ->toBe($scheduledAt->toDateTimeString())
        ->and($announcement->announcement_date->toDateString())
        ->toBe($scheduledAt->toDateString());
});

test('announcement creation requires a title and description', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'announcement_status' => 'Draft',
        ]);

    $response->assertSessionHasErrors([
        'title',
        'description_content',
    ]);

    expect(Announcement::query()->count())->toBe(0);
});

test('announcement creation rejects an unsupported status', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Invalid Status Announcement',
            'description_content' => 'Test description.',
            'announcement_status' => 'Archived',
        ]);

    $response->assertSessionHasErrors('announcement_status');

    expect(Announcement::query()->count())->toBe(0);
});

test('scheduled announcement requires a future scheduled date', function () {
    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Missing Schedule',
            'description_content' => 'Test description.',
            'announcement_status' => 'Scheduled',
        ]);

    $response->assertSessionHasErrors('scheduled_at');

    expect(Announcement::query()->count())->toBe(0);
});

test('non-admin users cannot create announcements', function () {
    $response = $this->actingAs($this->student)
        ->post(route('admin.announcements.store'), [
            'title' => 'Unauthorized Announcement',
            'description_content' => 'This should not be created.',
            'announcement_status' => 'Draft',
        ]);

    $response->assertForbidden();

    expect(Announcement::query()->count())->toBe(0);
});

test('admin can update an announcement', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Original Title',
        'description_content' => 'Original description.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $response = $this->actingAs($this->admin)
        ->put(route('admin.announcements.update', $announcement), [
            'title' => 'Updated Title',
            'description_content' => 'Updated description.',
            'announcement_status' => 'Draft',
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'drafts']))
        ->assertSessionHas(
            'success',
            'Announcement updated successfully.'
        );

    $announcement->refresh();

    expect($announcement->title)->toBe('Updated Title')
        ->and($announcement->description_content)
        ->toBe('Updated description.')
        ->and($announcement->announcement_status)->toBe('Draft')
        ->and($announcement->published_at)->toBeNull()
        ->and($announcement->scheduled_at)->toBeNull();
});

test('admin can change a draft announcement to published', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Draft Announcement',
        'description_content' => 'Announcement awaiting publication.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $response = $this->actingAs($this->admin)
        ->put(route('admin.announcements.update', $announcement), [
            'title' => 'Draft Announcement',
            'description_content' => 'Announcement awaiting publication.',
            'announcement_status' => 'Published',
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'announcements']));

    $announcement->refresh();

    expect($announcement->announcement_status)->toBe('Published')
        ->and($announcement->published_at)->not->toBeNull()
        ->and($announcement->scheduled_at)->toBeNull();
});

test('admin can delete an announcement', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Announcement to Delete',
        'description_content' => 'This announcement will be deleted.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $response = $this->actingAs($this->admin)
        ->delete(route('admin.announcements.destroy', $announcement));

    $response->assertRedirect(route('admin.announcements.index'))
        ->assertSessionHas(
            'success',
            'Announcement deleted successfully.'
        );

    $this->assertDatabaseMissing('announcements', [
        'announcement_id' => $announcement->announcement_id,
    ]);
});

test('non-admin users cannot update announcements', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Protected Announcement',
        'description_content' => 'Only administrators can update this.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $response = $this->actingAs($this->student)
        ->put(route('admin.announcements.update', $announcement), [
            'title' => 'Unauthorized Change',
            'description_content' => 'This update should be blocked.',
            'announcement_status' => 'Draft',
        ]);

    $response->assertForbidden();

    expect($announcement->fresh()->title)->toBe('Protected Announcement');
});

test('non-admin users cannot delete announcements', function () {
    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Protected Announcement',
        'description_content' => 'Only administrators can delete this.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $response = $this->actingAs($this->student)
        ->delete(route('admin.announcements.destroy', $announcement));

    $response->assertForbidden();

    $this->assertDatabaseHas('announcements', [
        'announcement_id' => $announcement->announcement_id,
        'title' => 'Protected Announcement',
    ]);
});

test('admin can upload images when creating an announcement', function () {
    Storage::fake('public');

    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Announcement with Images',
            'description_content' => 'This announcement includes images.',
            'announcement_status' => 'Draft',
            'images' => [
                UploadedFile::fake()->image('campus-one.jpg', 800, 600),
            ],
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'drafts']));

    $announcement = Announcement::query()
        ->where('title', 'Announcement with Images')
        ->firstOrFail();

    expect($announcement->images)->toHaveCount(1);

    $path = $announcement->images->first()->image_path;

    Storage::disk('public')->assertExists($path);
    expect($path)->toEndWith('.webp');
});

test('admin can remove an image when updating an announcement', function () {
    Storage::fake('public');

    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Announcement with Removable Image',
        'description_content' => 'An image will be removed.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $path = 'announcements/old-image.jpg';
    Storage::disk('public')->put($path, 'fake image content');

    $image = $announcement->images()->create([
        'image_path' => $path,
    ]);

    $response = $this->actingAs($this->admin)
        ->put(route('admin.announcements.update', $announcement), [
            'title' => $announcement->title,
            'description_content' => $announcement->description_content,
            'announcement_status' => 'Draft',
            'remove_image_ids' => [$image->announcement_image_id],
        ]);

    $response->assertRedirect(route('admin.announcements.index', ['view' => 'drafts']));

    expect(
        AnnouncementImage::query()
            ->where('announcement_image_id', $image->announcement_image_id)
            ->exists()
    )->toBeFalse();

    Storage::disk('public')->assertMissing($path);
});

test('admin can delete an announcement and its stored images', function () {
    Storage::fake('public');

    $announcement = Announcement::create([
        'created_by_user_id' => $this->admin->id,
        'title' => 'Announcement with Image to Delete',
        'description_content' => 'Deleting this announcement removes its image.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
    ]);

    $path = 'announcements/image-to-delete.jpg';
    Storage::disk('public')->put($path, 'fake image content');

    $announcement->images()->create([
        'image_path' => $path,
    ]);

    $response = $this->actingAs($this->admin)
        ->delete(route('admin.announcements.destroy', $announcement));

    $response->assertRedirect(route('admin.announcements.index'));

    $this->assertDatabaseMissing('announcements', [
        'announcement_id' => $announcement->announcement_id,
    ]);

    Storage::disk('public')->assertMissing($path);
});

test('announcement creation rejects unsupported image formats', function () {
    Storage::fake('public');

    $response = $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Announcement with Invalid Image',
            'description_content' => 'This image format is unsupported.',
            'announcement_status' => 'Draft',
            'images' => [
                UploadedFile::fake()->create(
                    'campus.gif',
                    10,
                    'image/gif'
                ),
            ],
        ]);

    $response->assertSessionHasErrors('images.0');

    expect(
        Announcement::query()
            ->where('title', 'Announcement with Invalid Image')
            ->exists()
    )->toBeFalse();
});

function makeAnnouncement(User $creator, array $attributes = []): Announcement
{
    return Announcement::create([
        'created_by_user_id' => $creator->id,
        'title' => 'Announcement',
        'description_content' => 'Announcement body.',
        'announcement_date' => now()->toDateString(),
        'announcement_status' => 'Draft',
        'published_at' => null,
        'scheduled_at' => null,
        ...$attributes,
    ]);
}

test('the sidebar announcements link resolves to the management page', function () {
    $url = route('admin.announcements.index', ['view' => 'announcements']);

    expect($url)->toEndWith('/admin/announcements?view=announcements');

    $this->actingAs($this->admin)
        ->get($url)
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Announcements/Index')
            ->where('currentView', 'announcements')
        );
});

test('faculty cannot access any announcement management route', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'must_change_password' => false,
    ]);
    $announcement = makeAnnouncement($this->admin);

    $this->actingAs($faculty)
        ->get(route('admin.announcements.index'))
        ->assertForbidden();

    $this->actingAs($faculty)
        ->post(route('admin.announcements.store'), [
            'title' => 'Faculty attempt',
            'description_content' => 'Should be rejected.',
            'announcement_status' => 'Published',
        ])
        ->assertForbidden();

    $this->actingAs($faculty)
        ->delete(route('admin.announcements.destroy', $announcement))
        ->assertForbidden();

    expect(Announcement::query()->count())->toBe(1);
});

test('an admin with a pending password change is sent to the first-login page', function () {
    $this->admin->update(['must_change_password' => true]);

    $this->actingAs($this->admin)
        ->get(route('admin.announcements.index'))
        ->assertRedirect(route('password.first-login.edit'));
});

test('a new announcement without a status is saved as a draft', function () {
    $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'No status given',
            'description_content' => 'Should not be published.',
        ])
        ->assertRedirect(route('admin.announcements.index', ['view' => 'drafts']));

    $announcement = Announcement::query()->firstOrFail();

    expect($announcement->announcement_status)->toBe('Draft')
        ->and($announcement->published_at)->toBeNull();
});

test('each view lists only announcements in its status', function () {
    makeAnnouncement($this->admin, ['title' => 'Draft one']);
    makeAnnouncement($this->admin, [
        'title' => 'Published one',
        'announcement_status' => 'Published',
        'published_at' => now()->subHour(),
    ]);
    makeAnnouncement($this->admin, [
        'title' => 'Scheduled one',
        'announcement_status' => 'Scheduled',
        'scheduled_at' => now()->addDay(),
    ]);

    $titles = [
        'announcements' => 'Published one',
        'drafts' => 'Draft one',
        'schedule' => 'Scheduled one',
    ];

    foreach ($titles as $view => $title) {
        $this->actingAs($this->admin)
            ->get(route('admin.announcements.index', ['view' => $view]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentView', $view)
                ->has('announcements.data', 1)
                ->where('announcements.data.0.title', $title)
                ->where('announcementCounts', [
                    'announcements' => 1,
                    'drafts' => 1,
                    'schedule' => 1,
                ])
            );
    }
});

test('the published feed returns the first N posts for the requested limit', function () {
    foreach (range(1, 25) as $i) {
        makeAnnouncement($this->admin, [
            'title' => "Post {$i}",
            'announcement_status' => 'Published',
            'published_at' => now()->subMinutes($i),
        ]);
    }

    $feed = fn (array $query) => $this->actingAs($this->admin)
        ->get(route('admin.announcements.index', ['view' => 'announcements', ...$query]));

    $feed([])->assertInertia(fn (Assert $page) => $page
        ->has('announcements.data', 10)
        ->where('announcements.total', 25)
    );

    // Loading more always starts from the first post, so nothing is skipped.
    $feed(['limit' => 20])->assertInertia(fn (Assert $page) => $page
        ->has('announcements.data', 20)
        ->where('announcements.current_page', 1)
    );

    $feed(['limit' => 30])->assertInertia(fn (Assert $page) => $page
        ->has('announcements.data', 25)
    );
});

test('the published feed is ordered by publish time, newest first', function () {
    // Creation order is the reverse of publish order, so sorting by
    // created_at would put these in exactly the wrong order.
    $posts = [
        'Old draft, posted today' => [now()->subMinute(), now()->subWeek()],
        'Posted yesterday' => [now()->subDay(), now()->subDay()],
        'Posted last week' => [now()->subWeek(), now()->subHour()],
    ];

    foreach ($posts as $title => [$publishedAt, $createdAt]) {
        makeAnnouncement($this->admin, [
            'title' => $title,
            'announcement_status' => 'Published',
            'published_at' => $publishedAt,
        ])->forceFill(['created_at' => $createdAt])->save();
    }

    $this->actingAs($this->admin)
        ->get(route('admin.announcements.index', ['view' => 'announcements']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('announcements.data.0.title', 'Old draft, posted today')
            ->where('announcements.data.1.title', 'Posted yesterday')
            ->where('announcements.data.2.title', 'Posted last week')
        );
});

test('the feed limit is bounded and ignored outside the published view', function () {
    $perPage = fn (array $query) => $this->actingAs($this->admin)
        ->get(route('admin.announcements.index', $query))
        ->viewData('page')['props']['announcements']['per_page'];

    expect($perPage(['view' => 'announcements', 'limit' => 5000]))->toBe(200)
        ->and($perPage(['view' => 'announcements', 'limit' => 1]))->toBe(10)
        ->and($perPage(['view' => 'announcements', 'limit' => 'abc']))->toBe(10)
        ->and($perPage(['view' => 'drafts', 'limit' => 50]))->toBe(10)
        ->and($perPage(['view' => 'schedule', 'limit' => 50]))->toBe(10);
});

test('saving an edited scheduled announcement keeps its scheduled time', function () {
    $scheduledAt = now()->addDays(2)->setTime(9, 30);

    $announcement = makeAnnouncement($this->admin, [
        'announcement_status' => 'Scheduled',
        'scheduled_at' => $scheduledAt,
    ]);

    // The edit form sends back the serialized value (UTC, ending in "Z").
    $serialized = $announcement->toArray()['scheduled_at'];

    expect($serialized)->toEndWith('Z');

    $this->actingAs($this->admin)
        ->put(route('admin.announcements.update', $announcement), [
            'title' => 'Edited title',
            'description_content' => 'Edited body.',
            'announcement_status' => 'Scheduled',
            'scheduled_at' => $serialized,
        ])
        ->assertRedirect(route('admin.announcements.index', ['view' => 'schedule']));

    $announcement->refresh();

    expect($announcement->announcement_status)->toBe('Scheduled')
        ->and($announcement->scheduled_at->toDateTimeString())
        ->toBe($scheduledAt->toDateTimeString())
        ->and($announcement->published_at)->toBeNull();
});

test('a scheduled time entered in local time is stored unchanged', function () {
    $local = now()->addDay()->setTime(14, 15);

    $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Local time schedule',
            'description_content' => 'Entered from the date and time inputs.',
            'announcement_status' => 'Scheduled',
            'scheduled_at' => $local->format('Y-m-d\TH:i'),
        ]);

    $announcement = Announcement::query()->firstOrFail();

    expect($announcement->scheduled_at->toDateTimeString())
        ->toBe($local->toDateTimeString())
        ->and($announcement->announcement_date->toDateString())
        ->toBe($local->toDateString());
});

test('announcement creation rejects more than ten images', function () {
    Storage::fake('public');

    $images = collect(range(1, 11))
        ->map(fn (int $i) => UploadedFile::fake()->create("photo-{$i}.jpg", 10, 'image/jpeg'))
        ->all();

    $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Too many images',
            'description_content' => 'Eleven images.',
            'announcement_status' => 'Draft',
            'images' => $images,
        ])
        ->assertSessionHasErrors('images');

    expect(Announcement::query()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

test('announcement creation rejects images larger than 15 MB', function () {
    Storage::fake('public');

    $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Oversized image',
            'description_content' => 'Image is too large.',
            'announcement_status' => 'Draft',
            'images' => [
                UploadedFile::fake()->create('huge.jpg', 15361, 'image/jpeg'),
            ],
        ])
        ->assertSessionHasErrors('images.0');

    expect(Announcement::query()->count())->toBe(0);
});

test('a failed image save removes the files it already stored', function () {
    Storage::fake('public');

    // Fail on the second image, after the first file is already on disk.
    $saved = 0;
    AnnouncementImage::creating(function () use (&$saved) {
        if (++$saved === 2) {
            throw new RuntimeException('Simulated storage failure.');
        }
    });

    $this->withoutExceptionHandling();

    expect(fn () => $this->actingAs($this->admin)
        ->post(route('admin.announcements.store'), [
            'title' => 'Partially failing upload',
            'description_content' => 'Second image fails.',
            'announcement_status' => 'Published',
            'images' => [
                UploadedFile::fake()->image('first.jpg', 40, 40),
                UploadedFile::fake()->image('second.jpg', 40, 40),
            ],
        ]))->toThrow(RuntimeException::class, 'Simulated storage failure.');

    expect(Announcement::query()->count())->toBe(0)
        ->and(AnnouncementImage::query()->count())->toBe(0)
        ->and(Storage::disk('public')->allFiles())->toBe([]);
});

test('updating an announcement cannot remove another announcement image', function () {
    Storage::fake('public');

    $target = makeAnnouncement($this->admin, ['title' => 'Edited']);
    $other = makeAnnouncement($this->admin, ['title' => 'Untouched']);

    $otherPath = 'announcements/other.jpg';
    Storage::disk('public')->put($otherPath, 'other image');
    $otherImage = $other->images()->create(['image_path' => $otherPath]);

    $this->actingAs($this->admin)
        ->put(route('admin.announcements.update', $target), [
            'title' => 'Edited',
            'description_content' => 'Tries to remove a foreign image.',
            'announcement_status' => 'Draft',
            'remove_image_ids' => [$otherImage->announcement_image_id],
        ]);

    $this->assertDatabaseHas('announcement_images', [
        'announcement_image_id' => $otherImage->announcement_image_id,
    ]);

    Storage::disk('public')->assertExists($otherPath);
});
