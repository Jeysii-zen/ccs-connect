<?php

use App\Models\User;

test('guests are redirected to the login page when accessing admin account management', function () {
    $response = $this->get(route('admin.accounts.index'));

    $response->assertRedirect(route('login'));
});

test('admins can access account management', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index'));

    $response->assertOk();
});

test('students cannot access account management', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $this->actingAs($student);

    $response = $this->get(route('admin.accounts.index'));

    $response->assertForbidden();
});

test('faculty cannot access account management', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
    ]);

    $this->actingAs($faculty);

    $response = $this->get(route('admin.accounts.index'));

    $response->assertForbidden();
});
