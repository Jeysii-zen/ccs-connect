<?php

use App\Http\Requests\Admin\StoreFacultyAccountRequest;
use App\Http\Requests\Admin\StoreStudentAccountRequest;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

uses(RefreshDatabase::class);

test('admin is authorized to create student accounts', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $request = StoreStudentAccountRequest::create('/admin/accounts/students', 'POST');
    $request->setUserResolver(fn () => $admin);

    expect($request->authorize())->toBeTrue();
});

test('non-admin users are not authorized to create student accounts', function () {
    $student = User::factory()->create([
        'role' => 'student',
    ]);

    $request = StoreStudentAccountRequest::create('/admin/accounts/students', 'POST');
    $request->setUserResolver(fn () => $student);

    expect($request->authorize())->toBeFalse();
});

test('student account data passes validation when all required fields are valid', function () {
    $validator = Validator::make([
        'first_name' => 'John',
        'middle_name' => 'Chris',
        'last_name' => 'Magtuba',
        'student_number' => '24-01-001',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
        'email' => 'student@example.com',
    ], (new StoreStudentAccountRequest)->rules());

    expect($validator->passes())->toBeTrue();
});

test('student account validation requires the required fields', function () {
    $validator = Validator::make([], (new StoreStudentAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('first_name'))->toBeTrue()
        ->and($validator->errors()->has('last_name'))->toBeTrue()
        ->and($validator->errors()->has('student_number'))->toBeTrue()
        ->and($validator->errors()->has('year_level'))->toBeTrue()
        ->and($validator->errors()->has('block_number'))->toBeTrue()
        ->and($validator->errors()->has('email'))->toBeTrue();
});

test('student account validation rejects an invalid student number format', function () {
    $validator = Validator::make([
        'first_name' => 'John',
        'last_name' => 'Magtuba',
        'student_number' => '2401001',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
        'email' => 'student@example.com',
    ], (new StoreStudentAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('student_number'))->toBeTrue();
});

test('student account validation rejects an invalid email', function () {
    $validator = Validator::make([
        'first_name' => 'John',
        'last_name' => 'Magtuba',
        'student_number' => '24-01-001',
        'year_level' => '3rd Year',
        'block_number' => 'BSIT-31',
        'email' => 'not-an-email',
    ], (new StoreStudentAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('email'))->toBeTrue();
});

test('admin is authorized to create faculty accounts', function () {
    $admin = User::factory()->create([
        'role' => 'admin',
    ]);

    $request = StoreFacultyAccountRequest::create('/admin/accounts/faculty', 'POST');
    $request->setUserResolver(fn () => $admin);

    expect($request->authorize())->toBeTrue();
});

test('non-admin users are not authorized to create faculty accounts', function () {
    $faculty = User::factory()->create([
        'role' => 'faculty',
    ]);

    $request = StoreFacultyAccountRequest::create('/admin/accounts/faculty', 'POST');
    $request->setUserResolver(fn () => $faculty);

    expect($request->authorize())->toBeFalse();
});

test('faculty account data passes validation when all required fields are valid', function () {
    $validator = Validator::make([
        'first_name' => 'Maria',
        'middle_name' => 'Cruz',
        'last_name' => 'Santos',
        'suffix' => 'Jr.',
        'email' => 'faculty@example.com',
        'employment_type' => 'Full-time',
    ], (new StoreFacultyAccountRequest)->rules());

    expect($validator->passes())->toBeTrue();
});

test('faculty account validation requires the required fields', function () {
    $validator = Validator::make([], (new StoreFacultyAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('first_name'))->toBeTrue()
        ->and($validator->errors()->has('last_name'))->toBeTrue()
        ->and($validator->errors()->has('email'))->toBeTrue()
        ->and($validator->errors()->has('employment_type'))->toBeTrue();
});

test('faculty account validation rejects an invalid employment type', function () {
    $validator = Validator::make([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'faculty@example.com',
        'employment_type' => 'Contractual',
    ], (new StoreFacultyAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('employment_type'))->toBeTrue();
});

test('faculty account validation rejects an invalid email', function () {
    $validator = Validator::make([
        'first_name' => 'Maria',
        'last_name' => 'Santos',
        'email' => 'not-an-email',
        'employment_type' => 'Full-time',
    ], (new StoreFacultyAccountRequest)->rules());

    expect($validator->fails())->toBeTrue()
        ->and($validator->errors()->has('email'))->toBeTrue();
});
