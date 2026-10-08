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
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
    ], $admin);

    $student = User::where('student_number', '24-01-001')->first();

    expect($student)->not->toBeNull()
        ->and($student->role)->toBe('student')
        ->and($student->first_name)->toBe('John')
        ->and($student->middle_name)->toBe('Chris')
        ->and($student->last_name)->toBe('Magtuba')
        ->and($student->student_number)->toBe('24-01-001')
        ->and($student->year_level)->toBe('3rd Year')
        ->and($student->block_number)->toBe('BSIT-31')
        ->and($student->email)->toBeNull()
        ->and($student->account_status)->toBe('ACTIVE')
        ->and($student->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBe('CCSStudent@2026');

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
        'faculty_id' => 'FAC-001',
        'employment_type' => 'Full-time',
    ], $admin);

    $faculty = User::where('faculty_id', 'FAC-001')->first();

    expect($faculty)->not->toBeNull()
        ->and($faculty->role)->toBe('faculty')
        ->and($faculty->first_name)->toBe('Maria')
        ->and($faculty->last_name)->toBe('Santos')
        ->and($faculty->suffix)->toBe('Jr.')
        ->and($faculty->faculty_id)->toBe('FAC-001')
        ->and($faculty->employment_type)->toBe('Full-time')
        ->and($faculty->email)->toBeNull()
        ->and($faculty->account_status)->toBe('ACTIVE')
        ->and($faculty->must_change_password)->toBeTrue()
        ->and($temporaryPassword)->toBe('CCSFaculty@2026');

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
        'year_level' => '2nd Year',
        'block_number' => 'BSIT-21',
    ], $admin);

    $student = User::where('student_number', '24-01-002')->first();

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
        'faculty_id' => 'FAC-002',
        'employment_type' => 'Part-time',
    ], $admin);

    $faculty = User::where('faculty_id', 'FAC-002')->first();

    expect($faculty)->not->toBeNull();

    $this->assertDatabaseHas('activity_logs', [
        'user_id' => $admin->id,
        'action' => 'ACCOUNT_CREATED',
        'module' => 'Account Management',
    ]);
});
