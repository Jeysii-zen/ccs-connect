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
        'email' => 'student3@example.com',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ]);

    $response->assertRedirect(route('admin.accounts.index'));

    $response->assertSessionHas('account_creation.type', 'student');
    $response->assertSessionHas('account_creation.temporary_password');

    $temporaryPassword = $response->getSession()->get(
        'account_creation.temporary_password'
    );

    $student = User::where('email', 'student3@example.com')->first();

    expect($student)->not->toBeNull()
        ->and($student->role)->toBe('student')
        ->and($student->student_number)->toBe('24-01-003')
        ->and($student->account_status)->toBe('ACTIVE')
        ->and($student->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBeString()
        ->and($temporaryPassword)->not->toBeEmpty();

    expect(Hash::check($temporaryPassword, $student->password))->toBeTrue();

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
        'email' => 'faculty3@example.com',
        'employment_type' => 'Full-time',
    ]);

    $response->assertRedirect(route('admin.accounts.index'));

    $response->assertSessionHas('account_creation.type', 'faculty');
    $response->assertSessionHas('account_creation.temporary_password');

    $temporaryPassword = $response->getSession()->get(
        'account_creation.temporary_password'
    );

    $faculty = User::where('email', 'faculty3@example.com')->first();

    expect($faculty)->not->toBeNull()
        ->and($faculty->role)->toBe('faculty')
        ->and($faculty->employment_type)->toBe('Full-time')
        ->and($faculty->account_status)->toBe('ACTIVE')
        ->and($faculty->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBeString()
        ->and($temporaryPassword)->not->toBeEmpty();

    expect(Hash::check($temporaryPassword, $faculty->password))->toBeTrue();

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
            'email' => 'student4@example.com',
            'year_level' => '3rd Year',
            'block_number' => 'BSIT-31',
        ]
    );

    $response->assertForbidden();

    $this->assertDatabaseMissing('users', [
        'email' => 'student4@example.com',
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
            'email' => 'faculty4@example.com',
            'employment_type' => 'Part-time',
        ]
    );

    $response->assertForbidden();

    $this->assertDatabaseMissing('users', [
        'email' => 'faculty4@example.com',
    ]);
});

test('guests cannot create student accounts through the account management endpoint', function () {
    $response = $this->post(route('admin.accounts.students.store'), [
        'first_name' => 'John',
        'last_name' => 'Doe',
        'student_number' => '24-01-005',
        'email' => 'student5@example.com',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ]);

    $response->assertRedirect(route('login'));

    $this->assertDatabaseMissing('users', [
        'email' => 'student5@example.com',
    ]);
});

test('guests cannot create faculty accounts through the account management endpoint', function () {
    $response = $this->post(route('admin.accounts.faculty.store'), [
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'email' => 'faculty5@example.com',
        'employment_type' => 'Part-time',
    ]);

    $response->assertRedirect(route('login'));

    $this->assertDatabaseMissing('users', [
        'email' => 'faculty5@example.com',
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
            'email' => 'invalid-email',
            'year_level' => '3rd Year',
            'block_number' => 'BSIT-31',
        ]
    );

    $response->assertSessionHasErrors([
        'student_number',
        'email',
    ]);

    $this->assertDatabaseMissing('users', [
        'email' => 'invalid-email',
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
            'email' => 'faculty-invalid@example.com',
            'employment_type' => 'Contractual',
        ]
    );

    $response->assertSessionHasErrors([
        'employment_type',
    ]);

    $this->assertDatabaseMissing('users', [
        'email' => 'faculty-invalid@example.com',
    ]);
});
