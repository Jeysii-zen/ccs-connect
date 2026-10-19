// spec: tests/e2e/specs/event-management.md (2. Faculty event management)
// seed: tests/e2e/seed.spec.ts
import { confirmAction, createEvent, eventIdOf, showOnly, tabCount, toast, xsrfHeaders } from '../support/events';
import { expect, signIn, test } from '../support/fixtures';

test.describe('Faculty event management', () => {
    test.skip(({ isMobile }) => isMobile, 'Desktop covers this; the phone layout has its own test below.');

    test('Faculty creates a draft', async ({ page }) => {
        await signIn(page, 'faculty');
        const event = await createEvent(page, 'faculty');

        await expect(page.getByText('Create, publish, and manage the events you organize.')).toBeVisible();
        await expect(page).toHaveURL(/\/faculty\/events.*view=drafts/);
        const row = page.getByRole('row').filter({ hasText: event.title });
        await expect(row).toContainText('Draft');
        await expect(row).not.toContainText('by ');
    });

    test('Full lifecycle on own event', async ({ page }) => {
        await signIn(page, 'faculty');
        await page.goto('/faculty/events');
        const all = await tabCount(page, 'All events');
        const event = await createEvent(page, 'faculty');

        await showOnly(page, 'faculty', event.title);
        await confirmAction(page, 'Publish', event.title);

        await showOnly(page, 'faculty', event.title);
        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit event' });
        await dialog.getByLabel('Description').fill('Edited by faculty.');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(toast(page, 'Event updated successfully.')).toBeVisible();

        await showOnly(page, 'faculty', event.title);
        await confirmAction(page, 'Archive', event.title);

        await page.goto(`/faculty/events?view=archived&q=${encodeURIComponent(event.title)}`);
        for (const action of ['View', 'Participants of', 'Delete']) {
            await expect(page.getByRole('button', { name: `${action} ${event.title}`, exact: true })).toBeVisible();
        }
        for (const action of ['Edit', 'Publish', 'Archive']) {
            await expect(page.getByRole('button', { name: `${action} ${event.title}`, exact: true })).toHaveCount(0);
        }

        await confirmAction(page, 'Delete', event.title);
        await page.goto('/faculty/events');
        expect(await tabCount(page, 'All events')).toBe(all);
    });

    test('Only own events are listed', async ({ page }) => {
        const stamp = Date.now();
        await signIn(page, 'admin');
        const adminEvent = await createEvent(page, 'admin', { title: `Own ${stamp} admin` });
        await signIn(page, 'faculty');
        const facultyEvent = await createEvent(page, 'faculty', { title: `Own ${stamp} faculty` });

        await page.goto(`/faculty/events?view=all&q=${stamp}`);
        await expect(page.getByRole('button', { name: `View ${facultyEvent.title}`, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: `View ${adminEvent.title}`, exact: true })).toHaveCount(0);

        await signIn(page, 'admin');
        await page.goto(`/admin/events?view=all&q=${stamp}`);
        await expect(page.getByRole('row').filter({ hasText: facultyEvent.title })).toContainText('by Fe Faculty');
        await expect(page.getByRole('row').filter({ hasText: adminEvent.title })).toContainText('by Ada Admin');
    });

    test("Cannot change another user's event", async ({ page }) => {
        await signIn(page, 'admin');
        const event = await createEvent(page, 'admin');
        const id = await eventIdOf(page, 'admin', event.title);

        await signIn(page, 'faculty');
        const headers = await xsrfHeaders(page);
        const base = `/faculty/events/${id}`;
        const responses = [
            await page.request.put(base, { headers, form: { title: 'Taken over' } }),
            await page.request.patch(`${base}/publish`, { headers }),
            await page.request.patch(`${base}/archive`, { headers }),
            await page.request.delete(base, { headers }),
            await page.request.get(`${base}/participants`),
            await page.request.get(`${base}/check-in`),
        ];
        for (const response of responses) expect(response.status(), response.url()).toBe(403);

        await signIn(page, 'admin');
        await showOnly(page, 'admin', event.title);
        await expect(page.getByRole('row').filter({ hasText: event.title })).toContainText('Draft');
    });
});

test.describe('Faculty event management on a phone', () => {
    test.skip(({ isMobile }) => !isMobile, 'Phone layout only.');

    test('Mobile layout', async ({ page }) => {
        await signIn(page, 'faculty');
        const event = await createEvent(page, 'faculty');

        await showOnly(page, 'faculty', event.title);
        const card = page.getByRole('main').getByRole('listitem').filter({ hasText: event.title });
        await expect(card).toContainText('Draft');
        await expect(card).toContainText('Palma Hall');
        await expect(card).toContainText('0 / 30');
        for (const action of ['View', 'Participants of', 'Edit', 'Publish', 'Delete']) {
            await expect(card.getByRole('button', { name: `${action} ${event.title}`, exact: true })).toBeVisible();
        }

        await page.getByRole('button', { name: 'Create event' }).first().click();
        const dialog = page.getByRole('dialog', { name: 'Create event' });
        const save = dialog.getByRole('button', { name: 'Save as draft' });
        await save.scrollIntoViewIfNeeded();
        await expect(save).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
    });
});
