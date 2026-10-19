import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';

/** Accounts seeded by database/seeders/E2eSeeder.php. */
export const accounts = {
    admin: { email: 'admin@e2e.test', home: /\/admin\/accounts/ },
    faculty: { email: 'faculty@e2e.test', home: /\/dashboard/ },
    student: { email: 'student@e2e.test', home: /\/dashboard/ },
} as const;

export const PASSWORD = 'password';

export type Role = keyof typeof accounts;

/**
 * Every test fails on uncaught page errors and console errors, so a
 * broken page is caught even when no assertion looks at it.
 */
export const test = base.extend<{ pageErrors: string[] }>({
    pageErrors: [
        async ({ page }, use) => {
            const errors: string[] = [];

            page.on('pageerror', (error) => errors.push(`page error: ${error.message}`));
            page.on('console', (message) => {
                // shortcut: Reverb is sometimes unreachable in test runs (cause not found); online status degrades gracefully, so only its refused socket is ignored. Remove once Reverb is reliable here.
                if (/^WebSocket connection to 'wss?:\/\/localhost:8080\/.*ERR_CONNECTION_REFUSED/.test(message.text())) return;
                if (message.type() === 'error') errors.push(`console error: ${message.text()}`);
            });

            await use(errors);

            expect(errors, 'the page logged errors').toEqual([]);
        },
        { auto: true },
    ],
});

export { expect };

export async function loginAs(page: Page, role: Role) {
    await page.goto('/login');
    await page.getByLabel('Email / ID Number').fill(accounts[role].email);
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(accounts[role].home);
}

// Session cookies per role, kept for the whole run (workers: 1). Login is
// throttled to 5 per minute per account, so feature tests reuse a session.
const sessions = new Map<Role, Awaited<ReturnType<BrowserContext['cookies']>>>();

/** Signs in as `role` through the form once, then reuses its session cookies. Lands on the role's home page. */
export async function signIn(page: Page, role: Role) {
    const saved = sessions.get(role);

    if (saved) {
        await page.context().clearCookies();
        await page.context().addCookies(saved);
        await page.goto(role === 'admin' ? '/admin/accounts' : '/dashboard');
        // An expired session lands on /login instead; sign in again below.
        if (!page.url().includes('/login')) return;
    }

    await page.context().clearCookies();
    await loginAs(page, role);
    sessions.set(role, await page.context().cookies());
}
