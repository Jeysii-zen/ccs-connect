import { accounts, expect, loginAs, PASSWORD, test } from './support/fixtures';

// Every page here also fails on JavaScript/console errors (fixtures.ts).

test('public pages load', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome Back!' })).toBeVisible();

    await page.goto('/forgot-password');
    await expect(page.getByLabel(/email/i)).toBeVisible();

    await page.goto('/events');
    await expect(page.getByRole('heading', { name: 'Upcoming events', exact: true })).toBeVisible();
});

for (const role of ['admin', 'faculty', 'student'] as const) {
    test(`${role} signs in to their home page`, async ({ page }) => {
        await loginAs(page, role);
    });
}

test('a wrong password is rejected', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email / ID Number').fill(accounts.student.email);
    await page.getByLabel('Password', { exact: true }).fill(`${PASSWORD}-wrong`);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/credentials|incorrect|invalid/i)).toBeVisible();
});

test('guests are sent to sign in', async ({ page }) => {
    await page.goto('/admin/accounts');
    await expect(page).toHaveURL(/\/login/);
});
