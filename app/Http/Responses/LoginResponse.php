<?php

namespace App\Http\Responses;

use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Laravel\Fortify\Contracts\LoginResponse as LoginResponseContract;

class LoginResponse implements LoginResponseContract
{
    /**
     * Create the response after a successful login.
     */
    public function toResponse($request): RedirectResponse
    {
        $user = Auth::user();

        if ($user?->role === 'admin') {
            return redirect()->route('admin.accounts.index');
        }

        return redirect()->intended(
            route('dashboard', absolute: false)
        );
    }
}
