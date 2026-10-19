import { expect, test } from './support/fixtures';

test('dark mode can be switched on and is remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/login');
    const html = page.locator('html');
    await expect(html).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(page.getByRole('button', { name: 'Switch to light mode' })).toBeVisible();
});

test('the public header folds into a menu on phones', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'phone layout only');

    await page.goto('/events');
    const menu = page.getByRole('button', { name: 'Open menu' });
    await menu.click();

    const nav = page.locator('#public-mobile-menu');
    await expect(nav.getByRole('link', { name: 'Log in' })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(nav).toBeHidden();
});
