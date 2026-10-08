<?php

use App\Models\ActivityLog;
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

test('admins can update a student account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'first_name' => 'Old',
        'middle_name' => 'Middle',
        'last_name' => 'Student',
        'student_number' => '24-01-001',
        'year_level' => '2nd Year',
        'block_number' => 'A',
        'account_status' => 'ACTIVE',
    ]);

    $this->actingAs($admin);

    $response = $this->put(route('admin.accounts.students.update', $student), [
        'first_name' => 'Updated',
        'middle_name' => 'New Middle',
        'last_name' => 'Student',
        'student_number' => '24-02-099',
        'year_level' => '3rd Year',
        'block_number' => 'B',
    ]);

    $response
        ->assertRedirect(route('admin.accounts.index', [
            'section' => 'student',
        ]));

    $student->refresh();

    expect($student->first_name)->toBe('Updated')
        ->and($student->middle_name)->toBe('New Middle')
        ->and($student->student_number)->toBe('24-02-099')
        ->and($student->year_level)->toBe('3rd Year')
        ->and($student->block_number)->toBe('B');

    expect(ActivityLog::query()
        ->where('user_id', $admin->id)
        ->where('action', 'ACCOUNT_UPDATED')
        ->where('module', 'Account Management')
        ->exists()
    )->toBeTrue();
});

test('admins can update a faculty account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $faculty = User::factory()->create([
        'role' => 'faculty',
        'first_name' => 'Old',
        'middle_name' => 'Middle',
        'last_name' => 'Faculty',
        'suffix' => null,
        'faculty_id' => 'FAC-001',
        'employment_type' => 'Full-time',
        'account_status' => 'ACTIVE',
    ]);

    $this->actingAs($admin);

    $response = $this->put(route('admin.accounts.faculty.update', $faculty), [
        'first_name' => 'Updated',
        'middle_name' => 'New Middle',
        'last_name' => 'Faculty',
        'suffix' => 'Jr.',
        'faculty_id' => 'FAC-099',
        'employment_type' => 'Part-time',
    ]);

    $response
        ->assertRedirect(route('admin.accounts.index', [
            'section' => 'faculty',
        ]));

    $faculty->refresh();

    expect($faculty->first_name)->toBe('Updated')
        ->and($faculty->middle_name)->toBe('New Middle')
        ->and($faculty->suffix)->toBe('Jr.')
        ->and($faculty->faculty_id)->toBe('FAC-099')
        ->and($faculty->employment_type)->toBe('Part-time');

    expect(ActivityLog::query()
        ->where('user_id', $admin->id)
        ->where('action', 'ACCOUNT_UPDATED')
        ->where('module', 'Account Management')
        ->exists()
    )->toBeTrue();
});

test('students cannot update student accounts', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $target = User::factory()->create([
        'role' => 'student',
        'student_number' => '24-01-001',
    ]);

    $this->actingAs($student);

    $response = $this->put(route('admin.accounts.students.update', $target), [
        'first_name' => 'Updated',
        'last_name' => 'Student',
        'student_number' => '24-02-002',
        'year_level' => '3rd Year',
        'block_number' => 'B',
    ]);

    $response->assertForbidden();
});

test('faculty cannot update faculty accounts', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
    ]);

    $target = User::factory()->create([
        'role' => 'faculty',
        'faculty_id' => 'FAC-001',
    ]);

    $this->actingAs($faculty);

    $response = $this->put(route('admin.accounts.faculty.update', $target), [
        'first_name' => 'Updated',
        'last_name' => 'Faculty',
        'faculty_id' => 'FAC-002',
        'employment_type' => 'Full-time',
    ]);

    $response->assertForbidden();
});

test('student update rejects a duplicate student number', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $target = User::factory()->create([
        'role' => 'student',
        'student_number' => '24-01-001',
    ]);

    User::factory()->create([
        'role' => 'student',
        'student_number' => '24-01-002',
    ]);

    $this->actingAs($admin);

    $response = $this->from(route('admin.accounts.index'))
        ->put(route('admin.accounts.students.update', $target), [
            'first_name' => 'Updated',
            'last_name' => 'Student',
            'student_number' => '24-01-002',
            'year_level' => '3rd Year',
            'block_number' => 'B',
        ]);

    $response->assertSessionHasErrors('student_number');
});

test('faculty update rejects a duplicate faculty id', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $target = User::factory()->create([
        'role' => 'faculty',
        'faculty_id' => 'FAC-001',
    ]);

    User::factory()->create([
        'role' => 'faculty',
        'faculty_id' => 'FAC-002',
    ]);

    $this->actingAs($admin);

    $response = $this->from(route('admin.accounts.index'))
        ->put(route('admin.accounts.faculty.update', $target), [
            'first_name' => 'Updated',
            'last_name' => 'Faculty',
            'faculty_id' => 'FAC-002',
            'employment_type' => 'Full-time',
        ]);

    $response->assertSessionHasErrors('faculty_id');
});

test('admins can deactivate a student account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'account_status' => 'ACTIVE',
        'student_number' => '24-02-099',
        'last_seen_at' => now(),
    ]);

    $this->actingAs($admin);

    $response = $this->patch(
        route('admin.accounts.students.deactivate', $student)
    );

    $response->assertRedirect(route('admin.accounts.index', [
        'section' => 'student',
    ]));

    $student->refresh();

    expect($student->account_status)->toBe('DEACTIVATED')
        ->and($student->deactivated_at)->not->toBeNull()
        ->and($student->last_seen_at)->toBeNull();

    expect(ActivityLog::query()
        ->where('user_id', $admin->id)
        ->where('action', 'ACCOUNT_DEACTIVATED')
        ->where('module', 'Account Management')
        ->exists()
    )->toBeTrue();
});

test('non-admin users cannot deactivate student accounts', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $target = User::factory()->create([
        'role' => 'student',
        'account_status' => 'ACTIVE',
    ]);

    $this->actingAs($student);

    $response = $this->patch(
        route('admin.accounts.students.deactivate', $target)
    );

    $response->assertForbidden();

    $target->refresh();

    expect($target->account_status)->toBe('ACTIVE');
});

test('admins cannot deactivate an already deactivated student account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $student = User::factory()->create([
        'role' => 'student',
        'account_status' => 'DEACTIVATED',
        'deactivated_at' => now(),
    ]);

    $this->actingAs($admin);

    $response = $this->patch(
        route('admin.accounts.students.deactivate', $student)
    );

    $response->assertNotFound();
});
