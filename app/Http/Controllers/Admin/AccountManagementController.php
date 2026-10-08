<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFacultyAccountRequest;
use App\Http\Requests\Admin\StoreStudentAccountRequest;
use App\Http\Requests\Admin\UpdateFacultyAccountRequest;
use App\Http\Requests\Admin\UpdateStudentAccountRequest;
use App\Models\User;
use App\Services\AccountCreationService;
use App\Services\AccountManagementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountManagementController extends Controller
{
    public function index(
        Request $request,
        AccountManagementService $accountManagementService
    ): Response {
        $deactivatedRole = $request->string('deactivated_role')->trim()->value();

        if (! in_array($deactivatedRole, ['student', 'faculty'], true)) {
            $deactivatedRole = null;
        }

        return Inertia::render('Admin/Accounts/Index', [
            'students' => $accountManagementService->students(
                $request->string('search')->trim()->value() ?: null,
                $request->string('year_level')->trim()->value() ?: null,
                $request->string('block_number')->trim()->value() ?: null,
            ),
            'faculty' => $accountManagementService->faculty(
                $request->string('faculty_search')->trim()->value() ?: null,
                $request->string('employment_type')->trim()->value() ?: null,
            ),
            'deactivated' => $accountManagementService->deactivated(
                $request->string('deactivated_search')->trim()->value() ?: null,
                $deactivatedRole,
            ),
        ]);
    }

    public function storeStudent(
        StoreStudentAccountRequest $request,
        AccountCreationService $accountCreationService
    ): RedirectResponse {
        $temporaryPassword = $accountCreationService->createStudent(
            $request->validated(),
            $request->user()
        );

        return to_route('admin.accounts.index')->with(
            'account_creation',
            [
                'type' => 'student',
                'temporary_password' => $temporaryPassword,
            ]
        );
    }

    public function storeFaculty(
        StoreFacultyAccountRequest $request,
        AccountCreationService $accountCreationService
    ): RedirectResponse {
        $temporaryPassword = $accountCreationService->createFaculty(
            $request->validated(),
            $request->user()
        );

        return to_route('admin.accounts.index')->with(
            'account_creation',
            [
                'type' => 'faculty',
                'temporary_password' => $temporaryPassword,
            ]
        );
    }

    public function updateStudent(
        UpdateStudentAccountRequest $request,
        User $student,
        AccountManagementService $accountManagementService
    ): RedirectResponse {
        abort_unless(
            $student->role === 'student'
                && $student->account_status === 'ACTIVE',
            404
        );

        $accountManagementService->updateStudent(
            $student,
            $request->validated(),
            $request->user()
        );

        return to_route('admin.accounts.index', [
            'section' => 'student',
        ])->with('account_updated', 'Student account updated successfully.');
    }

    public function updateFaculty(
        UpdateFacultyAccountRequest $request,
        User $faculty,
        AccountManagementService $accountManagementService
    ): RedirectResponse {
        abort_unless(
            $faculty->role === 'faculty'
                && $faculty->account_status === 'ACTIVE',
            404
        );

        $accountManagementService->updateFaculty(
            $faculty,
            $request->validated(),
            $request->user()
        );

        return to_route('admin.accounts.index', [
            'section' => 'faculty',
        ])->with('account_updated', 'Faculty account updated successfully.');
    }

    public function deactivate(User $user): RedirectResponse
    {
        abort_if($user->role === 'admin', 403);

        $user->forceFill([
            'account_status' => 'DEACTIVATED',
            'deactivated_at' => now(),
        ])->save();

        return back();
    }

    public function reactivate(User $user): RedirectResponse
    {
        $user->forceFill([
            'account_status' => 'ACTIVE',
            'deactivated_at' => null,
        ])->save();

        return back();
    }
}
