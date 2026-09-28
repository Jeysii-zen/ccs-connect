<?php

namespace App\Services;

use App\Enums\AccountStatus;
use App\Models\LoginAttempt;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthenticationService
{
    public function __construct(
        protected ActivityLogService $activityLogService
    ) {
    }

    /**
     * Authenticate a user using the CCS Connect login rules.
     *
     * @throws ValidationException
     */
    public function authenticate(
        string $email,
        string $password
    ): User {
        $normalizedEmail = strtolower(trim($email));

        $user = User::where('email', $normalizedEmail)->first();

        if ($user && $this->isOnCooldown($user)) {
            throw ValidationException::withMessages([
                'email' => 'Too many failed login attempts. Please try again after the cooldown period.',
            ]);
        }

        if (!$user) {
            $this->recordFailedAttempt(
                null,
                $normalizedEmail
            );

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        if ($user->account_status !== AccountStatus::ACTIVE->value) {
            throw ValidationException::withMessages([
                'email' => 'Your account is not active. Please contact the CCS Connect administrator.',
            ]);
        }

        if (!Hash::check($password, $user->password)) {
            $this->recordFailedAttempt(
                $user,
                $normalizedEmail
            );

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        $this->recordSuccessfulAttempt($user, $normalizedEmail);

        return $user;
    }

    /**
     * Determine whether the user is currently under login cooldown.
     */
    protected function isOnCooldown(User $user): bool
    {
        if (!$user->login_cooldown_until) {
            return false;
        }

        if ($user->login_cooldown_until->isFuture()) {
            return true;
        }

        $user->forceFill([
            'login_cooldown_until' => null,
        ])->save();

        return false;
    }

    /**
     * Record a failed login attempt.
     */
    protected function recordFailedAttempt(
        ?User $user,
        string $email
    ): void {
        LoginAttempt::create([
            'user_id' => $user?->id,
            'email_used' => $email,
            'was_successful' => false,
            'attempted_at' => now(),
        ]);

        $this->activityLogService->log(
            $user,
            'LOGIN_FAILED',
            'Authentication',
            'Failed login attempt.'
        );

        if (!$user) {
            return;
        }

        $failedAttempts = $user->failed_login_attempts + 1;

        $attributes = [
            'failed_login_attempts' => $failedAttempts,
        ];

        if ($failedAttempts >= 5) {
            $attributes['login_cooldown_until'] = now()->addMinutes(5);
        }

        $user->forceFill($attributes)->save();
    }

    /**
     * Record a successful login attempt and reset login security state.
     */
    protected function recordSuccessfulAttempt(
        User $user,
        string $email
    ): void {
        LoginAttempt::create([
            'user_id' => $user->id,
            'email_used' => $email,
            'was_successful' => true,
            'attempted_at' => now(),
        ]);

        $user->forceFill([
            'failed_login_attempts' => 0,
            'login_cooldown_until' => null,
        ])->save();

        $this->activityLogService->log(
            $user,
            'LOGIN',
            'Authentication',
            'User successfully logged in.'
        );
    }

    /**
     * Record a logout activity.
     */
    public function logLogout(User $user): void
    {
        $this->activityLogService->log(
            $user,
            'LOGOUT',
            'Authentication',
            'User logged out.'
        );
    }
}