<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Symfony\Component\HttpFoundation\Response;

/**
 * Rate-limits the Fortify POST routes that Fortify registers without a
 * limiter of its own, using the limiters defined in AppServiceProvider.
 * (Login has its own "login" limiter, set in config/fortify.php.)
 */
class ThrottleFortifyRoutes
{
    /** @var array<string, string> route name => limiter */
    private const LIMITERS = [
        'password.email' => 'password-reset',        // send reset link (email)
        'password.update' => 'password-reset',       // reset with token
        'password.confirm.store' => 'password',      // Fortify's own confirm-password
    ];

    public function __construct(
        private readonly ThrottleRequests $throttle
    ) {}

    public function handle(Request $request, Closure $next): Response
    {
        $limiter = self::LIMITERS[$request->route()?->getName() ?? ''] ?? null;

        if ($limiter !== null && $request->isMethod('post')) {
            return $this->throttle->handle($request, $next, $limiter);
        }

        return $next($request);
    }
}
