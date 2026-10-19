<?php

/*
 * Resets the browser-test database before a Playwright run (global-setup.ts):
 * creates ccs_connect_e2e if needed, deletes the previous run's uploads, then
 * migrate:fresh + E2eSeeder. With --cleanup (global-teardown.ts) it only
 * deletes the uploads.
 *
 * DB_DATABASE is forced through the real environment, which the .env file
 * cannot override. migrate:fresh drops every table, so this refuses to run
 * against anything but the e2e database (e.g. when the config is cached).
 */

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

const E2E_DATABASE = 'ccs_connect_e2e';

$root = dirname(__DIR__, 3);

if (file_exists("{$root}/bootstrap/cache/config.php")) {
    fwrite(STDERR, "Laravel's config is cached, so the e2e database override would be ignored.\nRun `php artisan config:clear` and try again.\n");
    exit(1);
}

putenv('DB_DATABASE='.E2E_DATABASE);
$_ENV['DB_DATABASE'] = $_SERVER['DB_DATABASE'] = E2E_DATABASE;

require "{$root}/vendor/autoload.php";
$app = require "{$root}/bootstrap/app.php";
$app->make(Kernel::class)->bootstrap();

$connection = config('database.default');

if (config("database.connections.{$connection}.database") !== E2E_DATABASE) {
    fwrite(STDERR, 'Refusing to reset: not connected to '.E2E_DATABASE.".\n");
    exit(1);
}

// The E2E database must be created beforehand by a MySQL administrator.
// The test account only needs privileges on this dedicated database.
DB::purge($connection);

try {
    DB::connection($connection)->getPdo();
} catch (Throwable $exception) {
    fwrite(
        STDERR,
        "Cannot connect to the E2E database '".E2E_DATABASE.
        "'. Verify that it exists and the configured test account has access.\n"
    );

    exit(1);
}

/*
 * Resets the browser-test database before a Playwright run (global-setup.ts):
 * requires the pre-created ccs_connect_e2e database, deletes matching uploads
 * from previous runs, then runs migrate:fresh + E2eSeeder. With --cleanup
 * (global-teardown.ts), it only deletes matching uploads.
 *
 * DB_DATABASE is forced through the real environment, which the .env file
 * cannot override. migrate:fresh drops every table, so this refuses to run
 * against anything but the E2E database.
 */

$uploadPaths = [
    ['events', 'poster_path', 'public', '~^events/[A-Za-z0-9]{40}\.webp$~D'],
    ['announcement_images', 'image_path', 'public', '~^announcements/[A-Za-z0-9]{40}\.webp$~D'],
    ['users', 'profile_picture_path', 'public', '~^profile-pictures/[A-Za-z0-9]{40}\.webp$~D'],
    ['event_registrations', 'proof_photo_path', 'local', '~^proofs/[0-9]+/[A-Za-z0-9]{40}\.webp$~D'],
];

foreach ($uploadPaths as [$table, $column, $disk, $pattern]) {
    if (! Schema::hasTable($table)) {
        continue;
    }

    $paths = DB::table($table)
        ->whereNotNull($column)
        ->pluck($column);

    foreach ($paths as $path) {
        if (! is_string($path) || ! preg_match($pattern, $path)) {
            continue;
        }

        Storage::disk($disk)->delete($path);
    }
}

if (in_array('--cleanup', $argv, true)) {
    echo "E2E uploads deleted.\n";
    exit(0);
}

Artisan::call('migrate:fresh', ['--seed' => true, '--seeder' => 'Database\\Seeders\\E2eSeeder', '--force' => true]);

echo 'E2E database '.E2E_DATABASE." is ready.\n";
