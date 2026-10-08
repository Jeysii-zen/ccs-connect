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
    ) {}

    public function authenticate(
        string $identifier,
        string $password
    ): User {
        $normalizedIdentifier = trim($identifier);

        $user = User::query()
            ->where('email', strtolower($normalizedIdentifier))
            ->orWhere('student_number', $normalizedIdentifier)
            ->orWhere('faculty_id', $normalizedIdentifier)
            ->first();

        if ($user && $this->isOnCooldown($user)) {
            throw ValidationException::withMessages([
                'login_identifier' => 'Too many failed login attempts. Please try again after the cooldown period.',
            ]);
        }

        if (! $user) {
            $this->recordFailedAttempt(
                null,
                $normalizedIdentifier
            );

            throw ValidationException::withMessages([
                'login_identifier' => trans('auth.failed'),
            ]);
        }

        if ($user->account_status !== AccountStatus::ACTIVE->value) {
            throw ValidationException::withMessages([
                'login_identifier' => 'Your account is not active. Please contact the CCS Connect administrator.',
            ]);
        }

        if (! Hash::check($password, $user->password)) {
            $this->recordFailedAttempt(
                $user,
                $normalizedIdentifier
            );

            throw ValidationException::withMessages([
                'login_identifier' => trans('auth.failed'),
            ]);
        }

        $this->recordSuccessfulAttempt(
            $user,
            $normalizedIdentifier
        );

        return $user;
    }

    protected function isOnCooldown(User $user): bool
    {
        $cooldownUntil = $user->login_cooldown_until;

        if (! $cooldownUntil) {
            return false;
        }

        if ($cooldownUntil->isFuture()) {
            return true;
        }

        $user->forceFill([
            'login_cooldown_until' => null,
        ])->save();

        return false;
    }

    protected function recordFailedAttempt(
        ?User $user,
        string $identifier
    ): void {
        LoginAttempt::create([
            'user_id' => $user?->id,
            'email_used' => $identifier,
            'was_successful' => false,
            'attempted_at' => now(),
        ]);

        $this->activityLogService->log(
            $user,
            'LOGIN_FAILED',
            'Authentication',
            'Failed login attempt.'
        );

        if (! $user) {
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

    protected function recordSuccessfulAttempt(
        User $user,
        string $identifier
    ): void {
        LoginAttempt::create([
            'user_id' => $user->id,
            'email_used' => $identifier,
            'was_successful' => true,
            'attempted_at' => now(),
        ]);

        $user->forceFill([
            'failed_login_attempts' => 0,
            'login_cooldown_until' => null,
            'last_login_at' => now(),
        ])->save();

        $this->activityLogService->log(
            $user,
            'LOGIN',
            'Authentication',
            'User successfully logged in.'
        );
    }

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
