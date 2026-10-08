<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class AccountManagementService
{
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
}
