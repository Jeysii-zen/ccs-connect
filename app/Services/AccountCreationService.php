<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AccountCreationService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {}

    /**
     * Create a Student account and return the temporary password.
     *
     * @param  array<string, mixed>  $data
     */
    public function createStudent(array $data, User $createdBy): string
    {
        return DB::transaction(function () use ($data, $createdBy): string {
            $temporaryPassword = $this->generateTemporaryPassword();

            $student = User::create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'student_number' => $data['student_number'],
                'email' => strtolower(trim($data['email'])),
                'password' => $temporaryPassword,
                'role' => 'student',
                'year_level' => $data['year_level'],
                'block_number' => $data['block_number'],
                'account_status' => 'ACTIVE',
                'must_change_password' => true,
            ]);

            $this->activityLogService->log(
                $createdBy,
                'ACCOUNT_CREATED',
                'Account Management',
                "Created Student account for user ID {$student->id}."
            );

            return $temporaryPassword;
        });
    }

    /**
     * Create a Faculty account and return the temporary password.
     *
     * @param  array<string, mixed>  $data
     */
    public function createFaculty(array $data, User $createdBy): string
    {
        return DB::transaction(function () use ($data, $createdBy): string {
            $temporaryPassword = $this->generateTemporaryPassword();

            $faculty = User::create([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
                'email' => strtolower(trim($data['email'])),
                'password' => $temporaryPassword,
                'role' => 'faculty',
                'employment_type' => $data['employment_type'],
                'account_status' => 'ACTIVE',
                'must_change_password' => true,
            ]);

            $this->activityLogService->log(
                $createdBy,
                'ACCOUNT_CREATED',
                'Account Management',
                "Created Faculty account for user ID {$faculty->id}."
            );

            return $temporaryPassword;
        });
    }

    private function generateTemporaryPassword(): string
    {
        return Str::password(
            length: 16,
            letters: true,
            numbers: true,
            symbols: true,
            spaces: false,
        );
    }
}
