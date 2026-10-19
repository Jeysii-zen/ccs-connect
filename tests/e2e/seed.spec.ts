import { loginAs, test } from './support/fixtures';

/**
 * Starting point for the Playwright Test agents (planner, generator,
 * healer): a signed-in admin. Change the role to explore other areas.
 */
test.describe('Seed', () => {
    test('seed', async ({ page }) => {
        await loginAs(page, 'admin');
    });
});
