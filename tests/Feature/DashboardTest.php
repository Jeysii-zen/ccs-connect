<?php

use App\Models\User;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));

    $response->assertRedirect(route('login'));
});

test('verified students can visit the dashboard', function () {
    $student = User::factory()->create([
        'role' => 'student',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($student);

    $response = $this->get(route('dashboard'));

    $response->assertOk();
});

test('non-students cannot visit the student dashboard', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
        'email_verified_at' => now(),
    ]);

    $this->actingAs($faculty);

    $response = $this->get(route('dashboard'));

    $response->assertForbidden();
});
