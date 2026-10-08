<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('student with temporary password is forced to the first-login password page', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->get(route('dashboard'));

    $response->assertRedirect(route('password.first-login.edit'));
});

test('faculty with temporary password is forced to the first-login password page', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($faculty)->get(route('profile.edit'));

    $response->assertRedirect(route('password.first-login.edit'));
});

test('student can access the first-login password page', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($student)->get(
        route('password.first-login.edit')
    );

    $response->assertOk();
});

test('student can change the temporary password', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]
    );

    $response->assertRedirect(route('dashboard'));

    $student->refresh();

    expect($student->must_change_password)->toBeFalse();

    expect(
        Hash::check('NewSecurePassword123!', $student->password)
    )->toBeTrue();
});

test('student cannot continue using the temporary password after changing it', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $this->actingAs($student)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]
    );

    $student->refresh();

    expect(
        Hash::check('TemporaryPassword123!', $student->password)
    )->toBeFalse();
});

test('user cannot bypass the first-login password requirement by accessing profile directly', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($student)->get(route('profile.edit'));

    $response->assertRedirect(route('password.first-login.edit'));
});

test('user cannot access password confirmation before completing first-login password change', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($student)->get(
        route('ccs.password.confirm')
    );

    $response->assertRedirect(route('password.first-login.edit'));
});

test('user cannot update their normal password before completing first-login password change', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->put(
        route('ccs.password.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]
    );

    $response->assertRedirect(route('password.first-login.edit'));

    $student->refresh();

    expect($student->must_change_password)->toBeTrue();

    expect(
        Hash::check('TemporaryPassword123!', $student->password)
    )->toBeTrue();
});

test('user cannot change the first-login password using an incorrect temporary password', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'WrongTemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]
    );

    $response->assertSessionHasErrors('current_password');

    $student->refresh();

    expect($student->must_change_password)->toBeTrue();

    expect(
        Hash::check('TemporaryPassword123!', $student->password)
    )->toBeTrue();
});

test('new password must be different from the temporary password', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'TemporaryPassword123!',
            'password_confirmation' => 'TemporaryPassword123!',
        ]
    );

    $response->assertSessionHasErrors('password');

    $student->refresh();

    expect($student->must_change_password)->toBeTrue();
});

test('password confirmation must match during first-login password change', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($student)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'DifferentPassword123!',
        ]
    );

    $response->assertSessionHasErrors('password');

    $student->refresh();

    expect($student->must_change_password)->toBeTrue();
});

test('faculty can complete the first-login password change', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'must_change_password' => true,
        'password' => 'TemporaryPassword123!',
    ]);

    $response = $this->actingAs($faculty)->put(
        route('password.first-login.update'),
        [
            'current_password' => 'TemporaryPassword123!',
            'password' => 'NewSecurePassword123!',
            'password_confirmation' => 'NewSecurePassword123!',
        ]
    );

    $response->assertRedirect(route('dashboard'));

    $faculty->refresh();

    expect($faculty->must_change_password)->toBeFalse();

    expect(
        Hash::check('NewSecurePassword123!', $faculty->password)
    )->toBeTrue();
});

test('user without a required password change can access normal routes', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($student)->get(route('dashboard'));

    $response->assertOk();
});
