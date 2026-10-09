<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('admin can create a student account through the account management endpoint', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $response = $this->actingAs($admin)->post(route('admin.accounts.students.store'), [
        'first_name' => 'John',
        'middle_name' => 'Chris',
        'last_name' => 'Magtuba',
        'student_number' => '24-01-003',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ]);

    $response
        ->assertRedirect(route('admin.accounts.index'));

    $response->assertSessionHas('account_creation.type', 'student');
    $response->assertSessionHas(
        'account_creation.temporary_password',
        'CCSStudent@2026'
    );

    $temporaryPassword = $response->getSession()->get(
        'account_creation.temporary_password'
    );

    $student = User::where('student_number', '24-01-003')->first();

    expect($student)->not->toBeNull()
        ->and($student->role)->toBe('student')
        ->and($student->student_number)->toBe('24-01-003')
        ->and($student->email)->toBeNull()
        ->and($student->account_status)->toBe('ACTIVE')
        ->and($student->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBe('CCSStudent@2026');

    expect(Hash::check($temporaryPassword, $student->password))->toBeTrue();

    $this->assertAuthenticatedAs($admin);

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $admin->id,
        'action' => 'ACCOUNT_CREATED',
        'module' => 'Account Management',
    ]);
});

test('admin can create a faculty account through the account management endpoint', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $response = $this->actingAs($admin)->post(route('admin.accounts.faculty.store'), [
        'first_name' => 'Maria',
        'middle_name' => 'Cruz',
        'last_name' => 'Santos',
        'suffix' => 'Jr.',
        'faculty_id' => 'FAC-003',
        'employment_type' => 'Full-time',
    ]);

    $response
        ->assertRedirect(route('admin.accounts.index'));

    $response->assertSessionHas('account_creation.type', 'faculty');
    $response->assertSessionHas(
        'account_creation.temporary_password',
        'CCSFaculty@2026'
    );

    $temporaryPassword = $response->getSession()->get(
        'account_creation.temporary_password'
    );

    $faculty = User::where('faculty_id', 'FAC-003')->first();

    expect($faculty)->not->toBeNull()
        ->and($faculty->role)->toBe('faculty')
        ->and($faculty->faculty_id)->toBe('FAC-003')
        ->and($faculty->email)->toBeNull()
        ->and($faculty->employment_type)->toBe('Full-time')
        ->and($faculty->account_status)->toBe('ACTIVE')
        ->and($faculty->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBe('CCSFaculty@2026');

    expect(Hash::check($temporaryPassword, $faculty->password))->toBeTrue();

    // Regression check for the reported faculty-creation logout bug.
    $this->assertAuthenticatedAs($admin);

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $admin->id,
        'action' => 'ACCOUNT_CREATED',
        'module' => 'Account Management',
    ]);
});

test('students cannot create student accounts through the account management endpoint', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $response = $this->actingAs($student)->post(
        route('admin.accounts.students.store'),
        [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'student_number' => '24-01-004',
            'year_level' => '3rd Year',
            'block_number' => 'BSIT-31',
        ]
    );

    $response->assertForbidden();

    $this->assertDatabaseMissing('users', [
        'student_number' => '24-01-004',
    ]);
});

test('faculty cannot create faculty accounts through the account management endpoint', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
    ]);

    $response = $this->actingAs($faculty)->post(
        route('admin.accounts.faculty.store'),
        [
            'first_name' => 'Ana',
            'last_name' => 'Reyes',
            'faculty_id' => 'FAC-004',
            'employment_type' => 'Part-time',
        ]
    );

    $response->assertForbidden();

    $this->assertDatabaseMissing('users', [
        'faculty_id' => 'FAC-004',
    ]);
});

test('guests cannot create student accounts through the account management endpoint', function () {
    $response = $this->post(route('admin.accounts.students.store'), [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'student_number' => '24-01-005',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ]);

    $response->assertRedirect(route('login'));

    $this->assertDatabaseMissing('users', [
        'student_number' => '24-01-005',
    ]);
});

test('guests cannot create faculty accounts through the account management endpoint', function () {
    $response = $this->post(route('admin.accounts.faculty.store'), [
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'faculty_id' => 'FAC-005',
        'employment_type' => 'Part-time',
    ]);

    $response->assertRedirect(route('login'));

    $this->assertDatabaseMissing('users', [
        'faculty_id' => 'FAC-005',
    ]);
});

test('invalid student account data is rejected before account creation', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $response = $this->actingAs($admin)->post(
        route('admin.accounts.students.store'),
        [
            'first_name' => 'John',
            'last_name' => 'Doe',
            'student_number' => '2401006',
            'year_level' => '3rd Year',
            'block_number' => 'BSIT-31',
        ]
    );

    $response->assertSessionHasErrors([
        'student_number',
    ]);

    $this->assertDatabaseMissing('users', [
        'student_number' => '2401006',
    ]);
});

test('invalid faculty account data is rejected before account creation', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $response = $this->actingAs($admin)->post(
        route('admin.accounts.faculty.store'),
        [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'faculty_id' => 'FAC-006',
            'employment_type' => 'Contractual',
        ]
    );

    $response->assertSessionHasErrors([
        'employment_type',
    ]);

    $this->assertDatabaseMissing('users', [
        'faculty_id' => 'FAC-006',
    ]);
});
