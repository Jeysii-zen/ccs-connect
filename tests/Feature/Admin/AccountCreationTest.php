<?php

use App\Models\User;
use App\Services\AccountCreationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

test('admin can create a student account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $service = app(AccountCreationService::class);

    $temporaryPassword = $service->createStudent([
        'first_name' => 'John',
        'middle_name' => 'Chris',
        'last_name' => 'Magtuba',
        'student_number' => '24-01-001',
        'email' => 'student@example.com',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ], $admin);

    $student = User::where('email', 'student@example.com')->first();

    expect($student)->not->toBeNull()
        ->and($student->role)->toBe('student')
        ->and($student->first_name)->toBe('John')
        ->and($student->middle_name)->toBe('Chris')
        ->and($student->last_name)->toBe('Magtuba')
        ->and($student->student_number)->toBe('24-01-001')
        ->and($student->year_level)->toBe('3rd Year')
        ->and($student->block_number)->toBe('BSIT-31')
        ->and($student->account_status)->toBe('ACTIVE')
        ->and($student->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBeString()
        ->and($temporaryPassword)->not->toBeEmpty();

    expect(Hash::check($temporaryPassword, $student->password))->toBeTrue();

    expect($student->password)->not->toBe($temporaryPassword);
});

test('admin can create a faculty account', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $service = app(AccountCreationService::class);

    $temporaryPassword = $service->createFaculty([
        'first_name' => 'Maria',
        'middle_name' => null,
        'last_name' => 'Santos',
        'suffix' => 'Jr.',
        'email' => 'faculty@example.com',
        'employment_type' => 'Full-time',
    ], $admin);

    $faculty = User::where('email', 'faculty@example.com')->first();

    expect($faculty)->not->toBeNull()
        ->and($faculty->role)->toBe('faculty')
        ->and($faculty->first_name)->toBe('Maria')
        ->and($faculty->last_name)->toBe('Santos')
        ->and($faculty->suffix)->toBe('Jr.')
        ->and($faculty->employment_type)->toBe('Full-time')
        ->and($faculty->account_status)->toBe('ACTIVE')
        ->and($faculty->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBeString()
        ->and($temporaryPassword)->not->toBeEmpty();

    expect(Hash::check($temporaryPassword, $faculty->password))->toBeTrue();

    expect($faculty->password)->not->toBe($temporaryPassword);
});

test('student account creation records an activity log', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $service = app(AccountCreationService::class);

    $service->createStudent([
        'first_name' => 'John',
        'last_name' => 'Doe',
        'student_number' => '24-01-002',
        'email' => 'student2@example.com',
        'year_level' => '2nd Year',
        'block_number' => 'BSIT-21',
    ], $admin);

    $student = User::where('email', 'student2@example.com')->first();

    expect($student)->not->toBeNull();

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $admin->id,
        'action' => 'ACCOUNT_CREATED',
        'module' => 'Account Management',
    ]);
});

test('faculty account creation records an activity log', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $service = app(AccountCreationService::class);

    $service->createFaculty([
        'first_name' => 'Ana',
        'last_name' => 'Reyes',
        'email' => 'faculty2@example.com',
        'employment_type' => 'Part-time',
    ], $admin);

    $faculty = User::where('email', 'faculty2@example.com')->first();

    expect($faculty)->not->toBeNull();

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $admin->id,
        'action' => 'ACCOUNT_CREATED',
        'module' => 'Account Management',
    ]);
});