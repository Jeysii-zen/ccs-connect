<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

test('students can visit the shared dashboard', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $this->actingAs($student);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});

test('faculty can visit the shared dashboard', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
    ]);

    $this->actingAs($faculty);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});

test('admins cannot visit the shared student and faculty dashboard', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('dashboard'));

    $response->assertForbidden();
});
