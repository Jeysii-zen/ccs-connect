<?php

namespace App\Http\Middleware;

use App\Enums\AccountStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ends the session of an account that is no longer active.
 *
 * Login already refuses deactivated accounts; this also stops a session
 * that was opened before an admin deactivated the account (questionnaire
 * Q10: "User cannot log in").
 */
class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->account_status !== AccountStatus::ACTIVE->value) {
            Auth::guard('web')->logout();

            $request->session()->invalidate();
            $request->session()->regenerateToken();

            if ($request->expectsJson()) {
                abort(401);
            }

            return redirect()->route('login')->withErrors([
                'login_identifier' => 'Your account is not active. Please contact the CCS Connect administrator.',
            ]);
        }

        return $next($request);
    }
}
