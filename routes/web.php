<?php

use App\Http\Controllers\Admin\AccountManagementController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\FirstLoginPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\ProfileController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'laravelVersion' => Application::VERSION,
        'phpVersion' => PHP_VERSION,
    ]);
});

Route::middleware('auth')->group(function () {
    Route::get(
        '/first-login/password',
        [FirstLoginPasswordController::class, 'edit']
    )->name('password.first-login.edit');

    Route::put(
        '/first-login/password',
        [FirstLoginPasswordController::class, 'update']
    )->name('password.first-login.update');
});

Route::middleware([
    'auth',
    'must.change.password',
])->group(function () {
    Route::get('/confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('ccs.password.confirm');

    Route::post('/confirm-password', [ConfirmablePasswordController::class, 'store'])
        ->name('ccs.password.confirm.store');

    Route::put('/password', [PasswordController::class, 'update'])
        ->name('ccs.password.update');
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard', [
        'user' => request()->user(),
    ]);
})->middleware(['auth', 'must.change.password', 'role:student,faculty'])->name('dashboard');

Route::middleware([
    'auth',
    'must.change.password',
    'role:admin',
])->group(function () {
    Route::get('/admin/accounts', [AccountManagementController::class, 'index'])
        ->name('admin.accounts.index');

    Route::post('/admin/accounts/students', [AccountManagementController::class, 'storeStudent'])
        ->name('admin.accounts.students.store');

    Route::post('/admin/accounts/faculty', [AccountManagementController::class, 'storeFaculty'])
        ->name('admin.accounts.faculty.store');

    Route::put('/admin/accounts/students/{student}', [AccountManagementController::class, 'updateStudent'])
        ->name('admin.accounts.students.update');

    Route::patch(
        '/admin/accounts/students/{student}/deactivate',
        [AccountManagementController::class, 'deactivateStudent']
    )->name('admin.accounts.students.deactivate');

    Route::patch(
        '/admin/accounts/faculty/{faculty}/deactivate',
        [AccountManagementController::class, 'deactivateFaculty']
    )->name('admin.accounts.faculty.deactivate');

    Route::put('/admin/accounts/faculty/{faculty}', [AccountManagementController::class, 'updateFaculty'])
        ->name('admin.accounts.faculty.update');

    Route::patch(
        '/admin/accounts/{user}/reactivate',
        [AccountManagementController::class, 'reactivate']
    )->name('admin.accounts.reactivate');
});

Route::middleware(['auth', 'must.change.password'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});
