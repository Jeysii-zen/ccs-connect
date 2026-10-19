<?php

use App\Http\Controllers\Admin\AccountManagementController;
use App\Http\Controllers\Admin\AnnouncementController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\Auth\ConfirmablePasswordController;
use App\Http\Controllers\Auth\FirstLoginPasswordController;
use App\Http\Controllers\Auth\PasswordController;
use App\Http\Controllers\EventManagementController;
use App\Http\Controllers\EventParticipantController;
use App\Http\Controllers\EventRegistrationController;
use App\Http\Controllers\EventReportController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProofController;
use App\Http\Controllers\PublicEventController;
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

// Published events (SSD2-B); drafts and archived events return 404.
Route::get('/events', [PublicEventController::class, 'index'])
    ->name('events.index');

Route::get('/events/{event}', [PublicEventController::class, 'show'])
    ->whereNumber('event')
    ->name('events.show');

Route::middleware('auth')->group(function () {
    Route::get('/first-login/password', [FirstLoginPasswordController::class, 'edit'])
        ->name('password.first-login.edit');

    Route::put('/first-login/password', [FirstLoginPasswordController::class, 'update'])
        ->middleware('throttle:password')
        ->name('password.first-login.update');
});

Route::middleware(['auth', 'must.change.password'])->group(function () {
    Route::get('/confirm-password', [ConfirmablePasswordController::class, 'show'])
        ->name('ccs.password.confirm');

    Route::post('/confirm-password', [ConfirmablePasswordController::class, 'store'])
        ->middleware('throttle:password')
        ->name('ccs.password.confirm.store');

    Route::put('/password', [PasswordController::class, 'update'])
        ->middleware('throttle:password')
        ->name('ccs.password.update');
});

Route::middleware([
    'auth',
    'must.change.password',
    'role:admin',
])->group(function () {

    // Admin announcement management
    Route::get('/admin/announcements', [AnnouncementController::class, 'index'])
        ->name('admin.announcements.index');

    Route::post('/admin/announcements', [AnnouncementController::class, 'store'])
        ->middleware('throttle:uploads')
        ->name('admin.announcements.store');

    Route::put('/admin/announcements/{announcement}', [AnnouncementController::class, 'update'])
        ->middleware('throttle:uploads')
        ->whereNumber('announcement')
        ->name('admin.announcements.update');

    Route::delete('/admin/announcements/{announcement}', [AnnouncementController::class, 'destroy'])
        ->middleware('throttle:writes')
        ->whereNumber('announcement')
        ->name('admin.announcements.destroy');

});

// Event management: Admin manages every event, Faculty only their own
// (EventPolicy). Both areas share one controller.
foreach (['admin', 'faculty'] as $role) {
    Route::middleware([
        'auth',
        'must.change.password',
        "role:{$role}",
    ])
        ->prefix("{$role}/events")
        ->name("{$role}.events.")
        ->controller(EventManagementController::class)
        ->group(function () {
            Route::get('/', 'index')->name('index');
            Route::post('/', 'store')->middleware('throttle:uploads')->name('store');
            Route::put('/{event}', 'update')->middleware('throttle:uploads')->whereNumber('event')->name('update');
            Route::patch('/{event}/publish', 'publish')->middleware('throttle:writes')->whereNumber('event')->name('publish');
            Route::patch('/{event}/archive', 'archive')->middleware('throttle:writes')->whereNumber('event')->name('archive');
            Route::delete('/{event}', 'destroy')->middleware('throttle:writes')->whereNumber('event')->name('destroy');

            // Event Participation: registered students and proof review.
            Route::get('/{event}/participants', [EventParticipantController::class, 'index'])
                ->whereNumber('event')
                ->name('participants.index');
            Route::patch('/{event}/participants/{registration}/proof', [ProofController::class, 'review'])
                ->middleware('throttle:writes')
                ->whereNumber(['event', 'registration'])
                ->scopeBindings()
                ->name('participants.proof.review');

            // Event Participation Report (Q39/Q40): preview, PDF, Excel.
            Route::get('/{event}/report/{format}', [EventReportController::class, 'show'])
                ->whereNumber('event')
                ->whereIn('format', ['preview', 'pdf', 'xlsx'])
                ->name('report');

            // QR check-in screen and attendance changes (Q33).
            Route::get('/{event}/check-in', [AttendanceController::class, 'display'])
                ->whereNumber('event')
                ->name('check-in');
            Route::patch('/{event}/participants/{registration}/attendance', [AttendanceController::class, 'update'])
                ->middleware('throttle:writes')
                ->whereNumber(['event', 'registration'])
                ->scopeBindings()
                ->name('participants.attendance.update');
            Route::delete('/{event}/participants/{registration}/attendance', [AttendanceController::class, 'destroy'])
                ->middleware('throttle:writes')
                ->whereNumber(['event', 'registration'])
                ->scopeBindings()
                ->name('participants.attendance.reset');
        });
}

// Student registration and proof upload (SSD3). The student is always the
// signed-in user; registrations cannot be cancelled (questionnaire Q25).
Route::middleware([
    'auth',
    'must.change.password',
    'role:student',
])->group(function () {
    Route::get('/my-events', [EventRegistrationController::class, 'index'])
        ->name('student.registrations.index');

    Route::post('/events/{event}/register', [EventRegistrationController::class, 'store'])
        ->middleware('throttle:event-registration')
        ->whereNumber('event')
        ->name('student.registrations.store');

    Route::post('/registrations/{registration}/proof', [ProofController::class, 'store'])
        ->middleware('throttle:uploads')
        ->whereNumber('registration')
        ->name('student.registrations.proof.store');

    // Where the event's QR code leads (SSD3-C).
    Route::get('/events/{event}/check-in', [AttendanceController::class, 'show'])
        ->whereNumber('event')
        ->name('student.check-in.show');

    Route::post('/events/{event}/check-in', [AttendanceController::class, 'store'])
        ->middleware('throttle:writes')
        ->whereNumber('event')
        ->name('student.check-in.store');
});

// Private proof photo: its owner or the event's managers (policy).
Route::get('/registrations/{registration}/proof', [ProofController::class, 'show'])
    ->middleware(['auth', 'must.change.password', 'throttle:proof-files'])
    ->whereNumber('registration')
    ->name('registrations.proof.show');

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
        ->middleware('throttle:writes')->name('admin.accounts.students.store');

    Route::post('/admin/accounts/faculty', [AccountManagementController::class, 'storeFaculty'])
        ->middleware('throttle:writes')->name('admin.accounts.faculty.store');

    Route::put('/admin/accounts/students/{student}', [AccountManagementController::class, 'updateStudent'])
        ->middleware('throttle:writes')->name('admin.accounts.students.update');

    Route::patch(
        '/admin/accounts/students/{student}/deactivate',
        [AccountManagementController::class, 'deactivateStudent']
    )->middleware('throttle:writes')->name('admin.accounts.students.deactivate');

    Route::patch(
        '/admin/accounts/faculty/{faculty}/deactivate',
        [AccountManagementController::class, 'deactivateFaculty']
    )->middleware('throttle:writes')->name('admin.accounts.faculty.deactivate');

    Route::put('/admin/accounts/faculty/{faculty}', [AccountManagementController::class, 'updateFaculty'])
        ->middleware('throttle:writes')->name('admin.accounts.faculty.update');

    Route::patch(
        '/admin/accounts/{user}/reactivate',
        [AccountManagementController::class, 'reactivate']
    )->middleware('throttle:writes')->name('admin.accounts.reactivate');
});

Route::middleware(['auth', 'must.change.password'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->middleware('throttle:uploads')->name('profile.update');
    // No self-service deletion or deactivation: it needs admin approval,
    // requested in person at the CCS department office.
});
