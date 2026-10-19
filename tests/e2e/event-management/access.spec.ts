// spec: tests/e2e/specs/event-management.md (5. Access control)
// seed: tests/e2e/seed.spec.ts
// Forbidden pages are checked with page.request: page.goto to a 403 logs a
// console error, which the fixture treats as a failure.
import type { Page } from '@playwright/test';
import { createEvent, eventIdOf, showOnly, xsrfHeaders } from '../support/events';
import { expect, signIn, test } from '../support/fixtures';

async function adminEventId(page: Page) {
    await signIn(page, 'admin');
    const event = await createEvent(page, 'admin');

    return { id: await eventIdOf(page, 'admin', event.title), title: event.title };
}

test.describe('Event management access control', () => {
    test.skip(({ isMobile }) => isMobile, 'Server-side rules; one project is enough.');

    test('Guest is redirected to login', async ({ page }) => {
        const { id } = await adminEventId(page);
        await page.context().clearCookies();

        for (const path of ['/admin/events', '/faculty/events', `/admin/events/${id}/participants`, `/admin/events/${id}/check-in`]) {
            await page.goto(path);
            await expect(page, path).toHaveURL(/\/login$/);
        }
    });

    test('Student is forbidden', async ({ page }) => {
        const { id } = await adminEventId(page);
        await signIn(page, 'student');

        for (const path of [
            '/admin/events',
            '/faculty/events',
            `/admin/events/${id}/participants`,
            `/admin/events/${id}/check-in`,
            `/faculty/events/${id}/participants`,
            `/faculty/events/${id}/check-in`,
        ]) {
            expect((await page.request.get(path)).status(), path).toBe(403);
        }
    });

    test('Faculty cannot use admin area', async ({ page }) => {
        await signIn(page, 'faculty');

        expect((await page.request.get('/admin/events')).status()).toBe(403);
        const post = await page.request.post('/admin/events', { headers: await xsrfHeaders(page), multipart: { title: 'Faculty via admin' } });
        expect(post.status()).toBe(403);
    });

    test('Admin cannot use faculty area', async ({ page }) => {
        await signIn(page, 'admin');

        const response = await page.request.get('/faculty/events');
        expect(response.status()).toBe(403);
        expect(await response.text()).toContain('Forbidden');
    });

    test('Student cannot create or delete via API', async ({ page }) => {
        const { id, title } = await adminEventId(page);
        await signIn(page, 'student');
        const headers = await xsrfHeaders(page);
        const stamp = `Student post ${Date.now()}`;

        for (const path of ['/admin/events', '/faculty/events']) {
            expect((await page.request.post(path, { headers, multipart: { title: stamp } })).status(), path).toBe(403);
        }
        expect((await page.request.delete(`/admin/events/${id}`, { headers })).status()).toBe(403);

        await signIn(page, 'admin');
        await showOnly(page, 'admin', title);
        await page.goto(`/admin/events?view=all&q=${encodeURIComponent(stamp)}`);
        await expect(page.getByText('No events match your search')).toBeVisible();
    });
});
