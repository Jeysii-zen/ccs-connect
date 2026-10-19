<?php

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
});

function profilePicture(string $name = 'me.png'): UploadedFile
{
    // A real 1x1 PNG, so the "image" rule's content sniffing accepts it.
    return UploadedFile::fake()->createWithContent(
        $name,
        base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', true)
    );
}

test('profile page is displayed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('profile.edit'))->assertOk();
});

test('email can be updated', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['email' => 'Fresh@Example.com'])
        ->assertSessionHasErrors('email');

    $this->actingAs($user)
        ->patch(route('profile.update'), ['email' => 'fresh@example.com'])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('profile.edit'));

    expect($user->refresh()->email)->toBe('fresh@example.com');
});

test('the email must belong to no other account', function () {
    $other = User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->create();

    $this->actingAs($user)
        ->patch(route('profile.update'), ['email' => $other->email])
        ->assertSessionHasErrors('email');
});

test('names and faculty ids cannot be changed by their owner', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'Jose',
        'faculty_id' => 'FAC-001',
    ]);

    $this->actingAs($faculty)->patch(route('profile.update'), [
        'email' => $faculty->email,
        'first_name' => 'Someone Else',
        'faculty_id' => 'FAC-999',
    ])->assertSessionHasNoErrors();

    expect($faculty->refresh())
        ->first_name->toBe('Jose')
        ->faculty_id->toBe('FAC-001');
});

test('a profile picture can be uploaded, replaced and removed', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.update'), [
            '_method' => 'patch',
            'email' => $user->email,
            'profile_picture' => profilePicture('first.png'),
        ])
        ->assertSessionHasNoErrors();

    $first = $user->refresh()->profile_picture_path;

    expect($first)->toStartWith('profile-pictures/');
    Storage::disk('public')->assertExists($first);

    $this->actingAs($user)->post(route('profile.update'), [
        '_method' => 'patch',
        'email' => $user->email,
        'profile_picture' => profilePicture('second.png'),
    ]);

    $second = $user->refresh()->profile_picture_path;

    expect($second)->not->toBe($first);
    Storage::disk('public')->assertExists($second);
    Storage::disk('public')->assertMissing($first);

    $this->actingAs($user)->patch(route('profile.update'), [
        'email' => $user->email,
        'remove_profile_picture' => true,
    ]);

    expect($user->refresh()->profile_picture_path)->toBeNull();
    Storage::disk('public')->assertMissing($second);
});

test('profile pictures must be images up to 5 MB', function (UploadedFile $file) {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('profile.update'), [
            '_method' => 'patch',
            'email' => $user->email,
            'profile_picture' => $file,
        ])
        ->assertSessionHasErrors('profile_picture');

    expect($user->refresh()->profile_picture_path)->toBeNull();
    expect(Storage::disk('public')->allFiles())->toBe([]);
})->with([
    'pdf' => fn () => UploadedFile::fake()->create('me.pdf', 10, 'application/pdf'),
    'over 5 MB' => fn () => UploadedFile::fake()->create('me.png', 5121, 'image/png'),
]);

test('accounts cannot be deleted from the profile', function () {
    $user = User::factory()->create();

    expect(Route::has('profile.destroy'))->toBeFalse();

    $this->actingAs($user)
        ->delete('/profile', ['password' => 'password'])
        ->assertMethodNotAllowed();

    expect($user->fresh())->not->toBeNull()
        ->and($user->fresh()->account_status)->toBe('ACTIVE');
});
