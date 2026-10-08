<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFacultyAccountRequest;
use App\Http\Requests\Admin\StoreStudentAccountRequest;
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
}
