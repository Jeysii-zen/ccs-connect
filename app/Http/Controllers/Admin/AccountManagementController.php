<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreFacultyAccountRequest;
use App\Http\Requests\Admin\StoreStudentAccountRequest;
use App\Services\AccountCreationService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class AccountManagementController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Admin/Accounts/Index');
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
