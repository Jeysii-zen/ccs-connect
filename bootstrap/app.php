<?php

use App\Http\Middleware\EnsureAccountIsActive;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LogLogoutActivity;
use App\Http\Middleware\MustChangePasswordMiddleware;
use App\Http\Middleware\RoleMiddleware;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\ThrottleFortifyRoutes;
use App\Http\Middleware\TrackUserPresence;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->redirectUsersTo(function (Request $request) {
            $user = $request->user();

            if ($user?->role === 'admin') {
                return route('admin.accounts.index');
            }

            return route('dashboard');
        });

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'must.change.password' => MustChangePasswordMiddleware::class,
        ]);

        $middleware->web(append: [
            // Before anything records activity for the request.
            EnsureAccountIsActive::class,
            ThrottleFortifyRoutes::class,
            SecurityHeaders::class,
            LogLogoutActivity::class,
            TrackUserPresence::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Sign-in and password forms that hit their limit show the wait
        // under the field instead of a bare 429 page. Other requests (and
        // non-Inertia clients) keep the 429 with its Retry-After header.
        $exceptions->render(function (ThrottleRequestsException $exception, Request $request) {
            $field = [
                'login.store' => 'login_identifier',
                'password.email' => 'email',
                'password.update' => 'email',
                'ccs.password.confirm.store' => 'password',
                'password.confirm.store' => 'password',
                'password.first-login.update' => 'current_password',
                'ccs.password.update' => 'current_password',
            ][$request->route()?->getName() ?? ''] ?? null;

            if ($field === null || ! $request->header('X-Inertia')) {
                return null;
            }

            $seconds = max(1, (int) ($exception->getHeaders()['Retry-After'] ?? 60));
            $wait = $seconds < 120 ? "{$seconds} seconds" : ((int) ceil($seconds / 60)).' minutes';

            return back()->withErrors([$field => "Too many attempts. Please try again in {$wait}."]);
        });
    })->create();
