<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class AccountManagementService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {}

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function students(
        ?string $search = null,
        ?string $yearLevel = null,
        ?string $blockNumber = null
    ): LengthAwarePaginator {
        return User::query()
            ->where('role', 'student')
            ->where('account_status', 'ACTIVE')
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('student_number', 'like', "%{$search}%");
                });
            })
            ->when($yearLevel, function ($query, $yearLevel) {
                $query->where('year_level', $yearLevel);
            })
            ->when($blockNumber, function ($query, $blockNumber) {
                $query->where('block_number', $blockNumber);
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(20, ['*'], 'students_page')
            ->withQueryString();
    }

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function faculty(
        ?string $search = null,
        ?string $employmentType = null
    ): LengthAwarePaginator {
        return User::query()
            ->where('role', 'faculty')
            ->where('account_status', 'ACTIVE')
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('faculty_id', 'like', "%{$search}%");
                });
            })
            ->when($employmentType, function ($query, $employmentType) {
                $query->where('employment_type', $employmentType);
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(20, ['*'], 'faculty_page')
            ->withQueryString();
    }

    /**
     * @return LengthAwarePaginator<int, User>
     */
    public function deactivated(
        ?string $search = null,
        ?string $role = null
    ): LengthAwarePaginator {
        return User::query()
            ->where('account_status', 'DEACTIVATED')
            ->when($role, function ($query, $role) {
                $query->where('role', $role);
            })
            ->when($search, function ($query, $search) {
                $query->where(function ($query) use ($search) {
                    $query
                        ->where('first_name', 'like', "%{$search}%")
                        ->orWhere('middle_name', 'like', "%{$search}%")
                        ->orWhere('last_name', 'like', "%{$search}%")
                        ->orWhere('student_number', 'like', "%{$search}%")
                        ->orWhere('faculty_id', 'like', "%{$search}%");
                });
            })
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->paginate(20, ['*'], 'deactivated_page')
            ->withQueryString();
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateStudent(
        User $student,
        array $data,
        User $updatedBy
    ): void {
        DB::transaction(function () use ($student, $data, $updatedBy): void {
            $student->update([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'student_number' => $data['student_number'],
                'year_level' => $data['year_level'],
                'block_number' => $data['block_number'],
            ]);

            $this->activityLogService->log(
                $updatedBy,
                'ACCOUNT_UPDATED',
                'Account Management',
                "Updated Student account for user ID {$student->id}."
            );
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function updateFaculty(
        User $faculty,
        array $data,
        User $updatedBy
    ): void {
        DB::transaction(function () use ($faculty, $data, $updatedBy): void {
            $faculty->update([
                'first_name' => $data['first_name'],
                'middle_name' => $data['middle_name'] ?? null,
                'last_name' => $data['last_name'],
                'suffix' => $data['suffix'] ?? null,
                'faculty_id' => $data['faculty_id'],
                'employment_type' => $data['employment_type'],
            ]);

            $this->activityLogService->log(
                $updatedBy,
                'ACCOUNT_UPDATED',
                'Account Management',
                "Updated Faculty account for user ID {$faculty->id}."
            );
        });
    }

    /**
     * Deactivate a student account.
     */
    public function deactivateStudent(User $student, User $deactivatedBy): void
    {
        DB::transaction(function () use ($student, $deactivatedBy): void {
            $student->update([
                'account_status' => 'DEACTIVATED',
                'deactivated_at' => now(),
                'last_seen_at' => null,
            ]);

            $this->activityLogService->log(
                $deactivatedBy,
                'ACCOUNT_DEACTIVATED',
                'Account Management',
                "Deactivated Student account for user ID {$student->id}."
            );
        });
    }
}
