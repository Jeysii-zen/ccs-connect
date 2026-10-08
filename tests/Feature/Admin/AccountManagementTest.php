<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

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

    $response
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Accounts/Index')
            ->has('students')
            ->has('faculty')
            ->has('deactivated')
        );
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

test('account management lists active students separately from active faculty', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    User::factory()->create([
        'role' => 'student',
        'first_name' => 'John',
        'last_name' => 'Student',
        'student_number' => '24-01-001',
        'account_status' => 'ACTIVE',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'Jane',
        'last_name' => 'Faculty',
        'faculty_id' => 'FAC-001',
        'account_status' => 'ACTIVE',
    ]);

    User::factory()->create([
        'role' => 'student',
        'first_name' => 'Inactive',
        'last_name' => 'Student',
        'student_number' => '24-01-002',
        'account_status' => 'DEACTIVATED',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index'));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Accounts/Index')
        ->where('students.data.0.student_number', '24-01-001')
        ->where('faculty.data.0.faculty_id', 'FAC-001')
        ->where('deactivated.data.0.student_number', '24-01-002')
    );
});

test('student listing supports search, year level, and block filters', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    User::factory()->create([
        'role' => 'student',
        'first_name' => 'John',
        'last_name' => 'Magtuba',
        'student_number' => '24-01-001',
        'year_level' => '4th Year',
        'block_number' => 'A',
        'account_status' => 'ACTIVE',
    ]);

    User::factory()->create([
        'role' => 'student',
        'first_name' => 'Jane',
        'last_name' => 'Doe',
        'student_number' => '24-02-002',
        'year_level' => '3rd Year',
        'block_number' => 'B',
        'account_status' => 'ACTIVE',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index', [
        'search' => 'Magtuba',
        'year_level' => '4th Year',
        'block_number' => 'A',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Accounts/Index')
        ->has('students.data', 1)
        ->where('students.data.0.student_number', '24-01-001')
    );
});

test('faculty listing supports search and employment type filters', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'Jane',
        'last_name' => 'Faculty',
        'faculty_id' => 'FAC-001',
        'employment_type' => 'Full-time',
        'account_status' => 'ACTIVE',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'John',
        'last_name' => 'Teacher',
        'faculty_id' => 'FAC-002',
        'employment_type' => 'Part-time',
        'account_status' => 'ACTIVE',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index', [
        'faculty_search' => 'FAC-001',
        'employment_type' => 'Full-time',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Accounts/Index')
        ->has('faculty.data', 1)
        ->where('faculty.data.0.faculty_id', 'FAC-001')
    );
});

test('deactivated listing supports search and student or faculty role filters', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    User::factory()->create([
        'role' => 'student',
        'first_name' => 'Inactive',
        'last_name' => 'Student',
        'student_number' => '24-01-001',
        'account_status' => 'DEACTIVATED',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'Inactive',
        'last_name' => 'Faculty',
        'faculty_id' => 'FAC-001',
        'account_status' => 'DEACTIVATED',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index', [
        'deactivated_search' => 'Inactive',
        'deactivated_role' => 'student',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Accounts/Index')
        ->has('deactivated.data', 1)
        ->where('deactivated.data.0.student_number', '24-01-001')
    );
});

test('deactivated role filter ignores unsupported roles', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    User::factory()->create([
        'role' => 'student',
        'student_number' => '24-01-001',
        'account_status' => 'DEACTIVATED',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'faculty_id' => 'FAC-001',
        'account_status' => 'DEACTIVATED',
    ]);

    $this->actingAs($admin);

    $response = $this->get(route('admin.accounts.index', [
        'deactivated_role' => 'admin',
    ]));

    $response->assertInertia(fn (Assert $page) => $page
        ->component('Admin/Accounts/Index')
        ->has('deactivated.data', 2)
    );
});
