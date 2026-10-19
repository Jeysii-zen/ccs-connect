<?php

use App\Http\Responses\PasswordResetLinkResponse;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

// Rate-limit counts live in the cache, which is the per-test "array" store
// (phpunit.xml), so every test starts from zero.

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
*/

test('a session ends as soon as the account is deactivated', function () {
    $student = User::factory()->create(['role' => 'student']);

    $this->actingAs($student)->get(route('dashboard'))->assertOk();

    $student->update(['account_status' => 'DEACTIVATED', 'deactivated_at' => now()]);

    $this->get(route('dashboard'))
        ->assertRedirect(route('login'))
        ->assertSessionHasErrors('login_identifier');

    $this->assertGuest();
});

test('a deactivated account is not revealed by a wrong password', function () {
    $user = User::factory()->create(['account_status' => 'DEACTIVATED']);

    $this->post('/login', ['login_identifier' => $user->email, 'password' => 'wrong-password'])
        ->assertSessionHasErrors(['login_identifier' => trans('auth.failed')]);

    $this->assertGuest();
});

test('a deactivated account with the right password is told it is inactive', function () {
    $user = User::factory()->create(['account_status' => 'DEACTIVATED']);

    $this->post('/login', ['login_identifier' => $user->email, 'password' => 'password'])
        ->assertSessionHasErrors([
            'login_identifier' => 'Your account is not active. Please contact the CCS Connect administrator.',
        ]);

    $this->assertGuest();
});

test('the forgot-password form answers the same for known and unknown emails', function () {
    $user = User::factory()->create();

    $known = $this->from('/forgot-password')->post('/forgot-password', ['email' => $user->email]);
    $unknown = $this->from('/forgot-password')->post('/forgot-password', ['email' => 'nobody@example.com']);

    $known->assertSessionHas('status', PasswordResetLinkResponse::MESSAGE)->assertSessionHasNoErrors();
    $unknown->assertSessionHas('status', PasswordResetLinkResponse::MESSAGE)->assertSessionHasNoErrors();
});

test('protected pages require a signed-in user', function (string $method, string $uri) {
    $this->{$method}($uri)->assertRedirect(route('login'));
})->with([
    ['get', '/admin/accounts'],
    ['get', '/admin/announcements'],
    ['get', '/admin/events'],
    ['get', '/faculty/events'],
    ['get', '/my-events'],
    ['get', '/dashboard'],
    ['get', '/profile'],
    ['post', '/events/1/register'],
    ['get', '/registrations/1/proof'],
]);

test('each role reaches only its own area', function (string $role, string $uri, int $status) {
    $this->actingAs(User::factory()->create(['role' => $role]))->get($uri)->assertStatus($status);
})->with([
    'student → admin accounts' => ['student', '/admin/accounts', 403],
    'student → faculty events' => ['student', '/faculty/events', 403],
    'faculty → admin accounts' => ['faculty', '/admin/accounts', 403],
    'faculty → admin announcements' => ['faculty', '/admin/announcements', 403],
    'faculty → my events' => ['faculty', '/my-events', 403],
    'admin → faculty events' => ['admin', '/faculty/events', 403],
    'admin → student dashboard' => ['admin', '/dashboard', 403],
]);

/*
|--------------------------------------------------------------------------
| Rate limiting
|--------------------------------------------------------------------------
*/

test('login is rate limited', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post('/login', ['login_identifier' => 'someone@example.com', 'password' => 'x']);
    }

    $this->post('/login', ['login_identifier' => 'someone@example.com', 'password' => 'x'])
        ->assertTooManyRequests();
});

test('password confirmation is rate limited per user', function () {
    $user = User::factory()->create();

    foreach (range(1, 6) as $attempt) {
        $this->actingAs($user)->post('/confirm-password', ['password' => 'wrong'])->assertSessionHasErrors('password');
    }

    $this->actingAs($user)->post('/confirm-password', ['password' => 'wrong'])->assertTooManyRequests();
});

test('password reset requests are rate limited', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post('/forgot-password', ['email' => "user{$attempt}@example.com"]);
    }

    $this->post('/forgot-password', ['email' => 'another@example.com'])->assertTooManyRequests();
});

test('login is also capped per IP across different accounts', function () {
    foreach (range(1, 60) as $attempt) {
        $this->post('/login', ['login_identifier' => "user{$attempt}@example.com", 'password' => 'x']);
    }

    $this->post('/login', ['login_identifier' => 'fresh@example.com', 'password' => 'x'])
        ->assertTooManyRequests();
});

test('resetting a password with a token is rate limited', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post('/reset-password', [
            'token' => "guess-{$attempt}",
            'email' => "user{$attempt}@example.com",
            'password' => 'NewPassword123!',
            'password_confirmation' => 'NewPassword123!',
        ]);
    }

    $this->post('/reset-password', ['token' => 'guess', 'email' => 'x@example.com'])->assertTooManyRequests();
});

test('fortify\'s own password confirmation route is rate limited', function () {
    $user = User::factory()->create();

    foreach (range(1, 6) as $attempt) {
        $this->actingAs($user)->post('/user/confirm-password', ['password' => 'wrong'])
            ->assertSessionHasErrors('password');
    }

    $this->actingAs($user)->post('/user/confirm-password', ['password' => 'wrong'])->assertTooManyRequests();
});

test('fortify\'s password confirmation accepts the right password', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post('/user/confirm-password', ['password' => 'password'])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('auth.password_confirmed_at');
});

test('reset emails are capped per IP per hour, across addresses', function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));

    // 4 minutes × 5 requests = 20, each under the per-minute limit.
    foreach (range(0, 3) as $minute) {
        foreach (range(1, 5) as $attempt) {
            $this->post('/forgot-password', ['email' => "m{$minute}-{$attempt}@example.com"])->assertStatus(302);
        }
        $this->travel(61)->seconds();
    }

    $this->post('/forgot-password', ['email' => 'one-more@example.com'])->assertTooManyRequests();
});

test('a non-Inertia client gets 429 with Retry-After', function () {
    foreach (range(1, 5) as $attempt) {
        $this->post('/login', ['login_identifier' => 'someone@example.com', 'password' => 'x']);
    }

    $this->post('/login', ['login_identifier' => 'someone@example.com', 'password' => 'x'])
        ->assertTooManyRequests()
        ->assertHeader('Retry-After');
});

test('the sign-in and password forms show the wait under the field', function (string $url, array $payload, string $field, int $allowed) {
    $user = User::factory()->create();
    $inertia = ['X-Inertia' => 'true'];

    if ($field === 'password') {
        $this->actingAs($user);
    }

    foreach (range(1, $allowed) as $attempt) {
        $this->from('/form')->post($url, $payload, $inertia);
    }

    $this->from('/form')->post($url, $payload, $inertia)
        ->assertRedirect('/form')
        ->assertSessionHasErrors([$field]);

    expect(session('errors')->first($field))->toMatch('/^Too many attempts\. Please try again in \d+ seconds\.$/');
})->with([
    'login' => ['/login', ['login_identifier' => 'someone@example.com', 'password' => 'x'], 'login_identifier', 5],
    'forgot password' => ['/forgot-password', ['email' => 'someone@example.com'], 'email', 5],
    'confirm password' => ['/confirm-password', ['password' => 'wrong'], 'password', 6],
]);

test('event registration is rate limited per student', function () {
    $this->travelTo(Carbon::parse('2026-11-01 08:00:00', 'Asia/Manila'));
    $student = User::factory()->create(['role' => 'student', 'year_level' => '3', 'block_number' => '2']);
    $event = Event::factory()->published()->create();

    foreach (range(1, 10) as $attempt) {
        $this->actingAs($student)->post(route('student.registrations.store', $event));
    }

    $this->actingAs($student)->post(route('student.registrations.store', $event))->assertTooManyRequests();

    // The limit counted requests, not registrations: still exactly one.
    expect(EventRegistration::count())->toBe(1);
});

/*
|--------------------------------------------------------------------------
| IDOR and row-level access
|--------------------------------------------------------------------------
*/

test('account routes refuse records of the wrong kind', function () {
    $admin = User::factory()->create(['role' => 'admin']);
    $faculty = User::factory()->create(['role' => 'faculty']);
    $otherAdmin = User::factory()->create(['role' => 'admin']);

    // A faculty account cannot be edited or deactivated as a "student".
    $this->actingAs($admin)
        ->put(route('admin.accounts.students.update', $faculty), [
            'first_name' => 'X', 'last_name' => 'Y', 'student_number' => '00-00-001',
            'year_level' => '1st Year', 'block_number' => 'B1',
        ])
        ->assertNotFound();

    $this->actingAs($admin)->patch(route('admin.accounts.students.deactivate', $faculty))->assertNotFound();

    // Admin accounts cannot be deactivated or "reactivated" through these routes.
    $this->actingAs($admin)->patch(route('admin.accounts.faculty.deactivate', $otherAdmin))->assertNotFound();
    $this->actingAs($admin)->patch(route('admin.accounts.reactivate', $otherAdmin))->assertNotFound();

    expect($faculty->refresh()->account_status)->toBe('ACTIVE')
        ->and($otherAdmin->refresh()->account_status)->toBe('ACTIVE');
});

test('students only ever see their own registration rows', function () {
    $mine = EventRegistration::factory()->create();
    $student = $mine->student;
    $others = EventRegistration::factory()->count(3)->create(['event_id' => $mine->event_id]);

    $this->actingAs($student)
        ->get(route('student.registrations.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('registrations.data', 1)
            ->where('registrations.data.0.registration.registration_id', $mine->registration_id));

    // The event page loads only the viewer's own registration, never another's.
    $this->actingAs($others->first()->student)
        ->get(route('events.show', $mine->event_id))
        ->assertInertia(fn (Assert $page) => $page
            ->where('registration.registration_id', $others->first()->registration_id));
});

test('another student\'s proof photo and upload endpoint are closed', function () {
    Storage::fake('local');
    Storage::disk('local')->put('proofs/private.png', 'secret');

    $victim = EventRegistration::factory()->submitted('proofs/private.png')->create();
    $attacker = User::factory()->create(['role' => 'student']);

    $this->actingAs($attacker)->get(route('registrations.proof.show', $victim))->assertForbidden();
    $this->actingAs($attacker)
        ->post(route('student.registrations.proof.store', $victim), [])
        ->assertForbidden();
});

test('private files have no public or signed URL route', function () {
    expect(Route::has('storage.local'))->toBeFalse()
        ->and(Route::has('storage.local.upload'))->toBeFalse();

    $this->get('/storage/proofs/private.png')->assertNotFound();
});

/*
|--------------------------------------------------------------------------
| Browser protections
|--------------------------------------------------------------------------
*/

test('responses carry baseline security headers', function () {
    $response = $this->get('/login');

    expect($response->headers->get('X-Content-Type-Options'))->toBe('nosniff')
        ->and($response->headers->get('X-Frame-Options'))->toBe('SAMEORIGIN')
        ->and($response->headers->get('Referrer-Policy'))->toBe('strict-origin-when-cross-origin')
        ->and($response->headers->get('Permissions-Policy'))->toContain('microphone=()');
});

test('account search filters are length-limited', function () {
    $admin = User::factory()->create(['role' => 'admin']);

    $this->actingAs($admin)
        ->get(route('admin.accounts.index', ['search' => str_repeat('a', 101)]))
        ->assertSessionHasErrors('search');
});
