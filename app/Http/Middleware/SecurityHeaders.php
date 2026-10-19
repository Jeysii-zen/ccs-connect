<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline browser protections for every web response. A Content Security
 * Policy is left out on purpose: the Vite dev server and Inertia's inline
 * page data would need nonces to work under one.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            // Do not guess content types (e.g. an upload served as HTML).
            'X-Content-Type-Options' => 'nosniff',
            // No framing by other sites (clickjacking).
            'X-Frame-Options' => 'SAMEORIGIN',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            // The camera is only used for proof selfies on this site.
            'Permissions-Policy' => 'camera=(self), microphone=(), geolocation=(), payment=()',
        ];

        foreach ($headers as $name => $value) {
            if (! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        return $response;
    }
}
