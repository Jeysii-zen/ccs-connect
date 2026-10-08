<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class FirstLoginPasswordController extends Controller
{
    /**
     * Show the required first-login password change page.
     */
    public function edit(): Response
    {
        return Inertia::render('Auth/FirstLoginPassword');
    }

    /**
     * Change the temporary password and complete first-login setup.
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => [
                'required',
                Password::defaults(),
                'confirmed',
                'different:current_password',
            ],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        return redirect()->route(
            $this->getPostPasswordChangeRoute($request)
        );
    }

    /**
     * Determine the user's normal destination after first-login setup.
     */
    private function getPostPasswordChangeRoute(Request $request): string
    {
        if ($request->user()->role === 'admin') {
            return 'admin.accounts.index';
        }

        return 'dashboard';
    }
}
