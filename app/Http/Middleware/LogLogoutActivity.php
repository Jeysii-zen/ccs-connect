<?php

namespace App\Http\Middleware;

use App\Services\AuthenticationService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogLogoutActivity
{
    public function __construct(
        protected AuthenticationService $authenticationService
    ) {}

    public function handle(
        Request $request,
        Closure $next
    ): Response {
        if (
            $request->isMethod('POST') &&
            $request->routeIs('logout')
        ) {
            $user = $request->user();

            if ($user) {
                $this->authenticationService->logLogout($user);
            }
        }

        return $next($request);
    }
}
