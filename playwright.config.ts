import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests (tests/e2e). `npx playwright test` starts the app itself
 * against the separate ccs_connect_e2e database, runs headless, then stops
 * it: no need to open the dev server. See tests/e2e/README.md.
 */
const PORT = 8123;
const baseURL = `http://127.0.0.1:${PORT}`;

// The real environment wins over .env, so the app under test can only use
// the e2e database (global-setup refuses to run if config is cached).
const appEnv = {
    ...process.env,
    DB_DATABASE: 'ccs_connect_e2e',
    APP_URL: baseURL,
    // Boost's dev browser logger posts every console line back to the server.
    BOOST_BROWSER_LOGS_WATCHER: 'false',
} as Record<string, string>;

export default defineConfig({
    testDir: './tests/e2e',
    globalSetup: './tests/e2e/support/global-setup.ts',
    globalTeardown: './tests/e2e/support/global-teardown.ts',

    // One shared database and a single-threaded PHP server.
    fullyParallel: false,
    workers: 1,
    // A failed test runs once more with a trace; one that then passes is
    // reported as flaky, not hidden.
    retries: 1,
    forbidOnly: !!process.env.CI,
    // PHP's built-in server answers one request at a time, and the first
    // requests compile PHP files: page loads take seconds, not milliseconds.
    timeout: 60_000,
    expect: { timeout: 15_000 },

    reporter: [['list'], ['html', { open: 'never' }]],

    use: {
        baseURL,
        // Recording costs a lot on this machine (video made one test 6s -> 40s),
        // so evidence is captured only for failures.
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
    },

    projects: [
        { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
        { name: 'mobile', use: { ...devices['Pixel 7'] } },
    ],

    webServer: [
        {
            // PHP's server directly: `artisan serve` drops env overrides
            // when it starts its child process.
            command: `php -S 127.0.0.1:${PORT} ../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php`,
            cwd: 'public',
            env: appEnv,
            url: `${baseURL}/up`,
            reuseExistingServer: false,
            timeout: 120_000,
        },
        {
            // Real-time online status; reuses Reverb if `composer run dev` runs it.
            command: 'php artisan reverb:start --port=8080',
            env: appEnv,
            port: 8080,
            reuseExistingServer: true,
            timeout: 60_000,
        },
    ],
});
