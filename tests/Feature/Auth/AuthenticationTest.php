<?php

use App\Models\LoginAttempt;
use App\Models\User;

test('login screen can be rendered', function () {
    $response = $this->get('/login');

    $response->assertStatus(200);
});

test('users can authenticate using the login screen', function () {
    $user = User::factory()->create();

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard', absolute: false));

    $this->assertDatabaseHas('login_attempts', [
        'user_id' => $user->id,
        'email_used' => $user->email,
        'was_successful' => true,
    ]);

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $user->id,
        'action' => 'LOGIN',
        'module' => 'Authentication',
    ]);
});

test('users can not authenticate with invalid password', function () {
    $user = User::factory()->create();

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();

    $this->assertDatabaseHas('login_attempts', [
        'user_id' => $user->id,
        'email_used' => $user->email,
        'was_successful' => false,
    ]);

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $user->id,
        'action' => 'LOGIN_FAILED',
        'module' => 'Authentication',
    ]);
});

test('five failed login attempts trigger a five minute cooldown', function () {
    $user = User::factory()->create();

    foreach (range(1, 5) as $attempt) {
        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);
    }

    $user->refresh();

    expect($user->failed_login_attempts)->toBe(5)
        ->and($user->login_cooldown_until)->not->toBeNull()
        ->and($user->login_cooldown_until->isFuture())->toBeTrue();

    expect(
        LoginAttempt::where('user_id', $user->id)
            ->where('was_successful', false)
            ->count()
    )->toBe(5);
});

test('login is blocked while five minute cooldown is active', function () {
    $user = User::factory()->create([
        'failed_login_attempts' => 5,
        'login_cooldown_until' => now()->addMinutes(5),
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();

    $response->assertSessionHasErrors('email');

    $user->refresh();

    expect($user->failed_login_attempts)->toBe(5);
});

test('successful login resets failed login attempts and cooldown', function () {
    $user = User::factory()->create([
        'failed_login_attempts' => 4,
        'login_cooldown_until' => null,
    ]);

    $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $user->refresh();

    expect($user->failed_login_attempts)->toBe(0)
        ->and($user->login_cooldown_until)->toBeNull();

    $this->assertAuthenticated();
});

test('deactivated users cannot authenticate', function () {
    $user = User::factory()->create([
        'account_status' => 'DEACTIVATED',
    ]);

    $response = $this->post('/login', [
        'email' => $user->email,
        'password' => 'password',
    ]);

    $this->assertGuest();

    $response->assertSessionHasErrors('email');
});

test('unknown email creates a failed login attempt without a user id', function () {
    $email = 'unknown-user@example.com';

    $this->post('/login', [
        'email' => $email,
        'password' => 'wrong-password',
    ]);

    $this->assertGuest();

    $this->assertDatabaseHas('login_attempts', [
        'user_id' => null,
        'email_used' => $email,
        'was_successful' => false,
    ]);
});

test('users can logout and a logout activity is recorded', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->post('/logout');

    $this->assertGuest();
    $response->assertRedirect('/');

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $user->id,
        'action' => 'LOGOUT',
        'module' => 'Authentication',
    ]);
});
