<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->configureRateLimiting();
    }

    /**
     * Named limiters for the routes in routes/web.php (login is configured
     * in FortifyServiceProvider). Signed-in requests are counted per user,
     * guests per IP address.
     */
    private function configureRateLimiting(): void
    {
        $byUser = fn (Request $request): string => $request->user()
            ? 'user:'.$request->user()->getAuthIdentifier()
            : 'ip:'.$request->ip();

        // Confirming, changing or setting a password: guesses at the
        // current password are capped.
        RateLimiter::for('password', fn (Request $request) => Limit::perMinute(6)->by($byUser($request)));

        // Reset links and resets: per IP, and per email so one address
        // cannot be flooded from many IPs. Each link is an outgoing email
        // (a paid mail provider in production), so one IP is also capped
        // per hour across all addresses.
        RateLimiter::for('password-reset', fn (Request $request) => [
            Limit::perMinute(5)->by('ip:'.$request->ip()),
            Limit::perHour(20)->by('ip-hour:'.$request->ip()),
            Limit::perHour(10)->by('email:'.Str::lower((string) $request->input('email'))),
        ]);

        RateLimiter::for('event-registration', fn (Request $request) => Limit::perMinute(10)->by($byUser($request)));

        // Requests that store files (posters, images, proof photos).
        RateLimiter::for('uploads', fn (Request $request) => Limit::perMinute(20)->by($byUser($request)));

        // Other state-changing requests (publish, archive, delete, reviews,
        // account changes).
        RateLimiter::for('writes', fn (Request $request) => Limit::perMinute(60)->by($byUser($request)));

        // Private proof images; a participants page loads many at once.
        RateLimiter::for('proof-files', fn (Request $request) => Limit::perMinute(300)->by($byUser($request)));
    }
}
