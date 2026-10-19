// spec: tests/e2e/specs/event-management.md (4. Lifecycle and public visibility)
// seed: tests/e2e/seed.spec.ts
import type { Page } from '@playwright/test';
import { confirmAction, createEvent, eventIdOf, registerAsStudent, showOnly, soonest } from '../support/events';
import { expect, signIn, test } from '../support/fixtures';

/** Signs out by dropping the cookies; `page` then browses as a guest. */
async function asGuest(page: Page) {
    await page.context().clearCookies();
}

/** Whether the public /events list (first page) mentions the title, read from the HTTP response. */
async function publicListHas(page: Page, title: string) {
    return (await (await page.request.get('/events')).text()).includes(title);
}

test.describe('Event lifecycle and public visibility', () => {
    test.skip(({ isMobile }) => isMobile, 'Desktop covers this; faculty.spec.ts checks the phone layout.');

    test.beforeEach(async ({ page }) => {
        await signIn(page, 'admin');
    });

    test('Draft is not public', async ({ page }) => {
        const event = await createEvent(page, 'admin', soonest());
        const id = await eventIdOf(page, 'admin', event.title);

        await asGuest(page);
        expect(await publicListHas(page, event.title)).toBe(false);
        expect((await page.request.get(`/events/${id}`)).status()).toBe(404);
    });

    test('Publish with confirmation', async ({ page }) => {
        const event = await createEvent(page, 'admin', soonest());
        const id = await eventIdOf(page, 'admin', event.title);
        await page.goto(`/admin/events?view=drafts&q=${encodeURIComponent(event.title)}`);

        await page.getByRole('button', { name: `Publish ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toContainText('Publish event?');
        await expect(dialog).toContainText(`${event.title} will become visible to students and guests.`);
        await dialog.getByRole('button', { name: 'Publish event' }).click();
        await expect(page.getByRole('button', { name: `View ${event.title}`, exact: true })).toBeHidden();
        await expect(page).toHaveURL(/view=drafts/);

        await page.goto(`/admin/events?view=published&q=${encodeURIComponent(event.title)}`);
        await expect(page.getByRole('button', { name: `View ${event.title}`, exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: `Publish ${event.title}`, exact: true })).toHaveCount(0);

        await asGuest(page);
        await page.goto('/events');
        await expect(page.getByText(event.title)).toBeVisible();
        await page.goto(`/events/${id}`);
        await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
    });

    test('Archive with confirmation', async ({ page }) => {
        const event = await createEvent(page, 'admin', { ...soonest(), publish: true });
        const id = await eventIdOf(page, 'admin', event.title);
        await showOnly(page, 'admin', event.title);

        await page.getByRole('button', { name: `Archive ${event.title}`, exact: true }).click();
        await expect(page.getByRole('alertdialog')).toContainText(
            'will be hidden from public lists and can no longer be edited. Its records, including registrations, are kept.',
        );
        await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
        await confirmAction(page, 'Archive', event.title);

        await page.goto(`/admin/events?view=archived&q=${encodeURIComponent(event.title)}`);
        await expect(page.getByRole('row').filter({ hasText: event.title })).toContainText('Archived');
        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Kept for records and hidden from public lists.');

        await asGuest(page);
        expect(await publicListHas(page, event.title)).toBe(false);
        expect((await page.request.get(`/events/${id}`)).status()).toBe(404);
    });

    test('Cancelling publish/archive leaves status', async ({ page }) => {
        const draft = await createEvent(page, 'admin');
        const published = await createEvent(page, 'admin', { publish: true });

        for (const [verb, title] of [['Publish', draft.title], ['Archive', published.title]] as const) {
            await showOnly(page, 'admin', title);
            await page.getByRole('button', { name: `${verb} ${title}`, exact: true }).click();
            await page.getByRole('alertdialog').getByRole('button', { name: 'Cancel' }).click();
            await expect(page.getByRole('alertdialog')).toBeHidden();
            await page.reload();
            await expect(page.getByRole('button', { name: `${verb} ${title}`, exact: true })).toBeVisible();
        }
    });

    test('Deleting a published event removes it publicly', async ({ page }) => {
        const event = await createEvent(page, 'admin', { ...soonest(), publish: true });
        const id = await eventIdOf(page, 'admin', event.title);
        await showOnly(page, 'admin', event.title);

        await confirmAction(page, 'Delete', event.title);
        await expect(page.getByRole('button', { name: `View ${event.title}`, exact: true })).toBeHidden();

        await asGuest(page);
        expect(await publicListHas(page, event.title)).toBe(false);
        expect((await page.request.get(`/events/${id}`)).status()).toBe(404);
    });

    test('Actions per status', async ({ page }) => {
        const draft = await createEvent(page, 'admin');
        const published = await createEvent(page, 'admin', { publish: true });
        const archived = await createEvent(page, 'admin', { publish: true });
        await showOnly(page, 'admin', archived.title);
        await confirmAction(page, 'Archive', archived.title);

        const expected = [
            [draft.title, ['View', 'Participants of', 'Edit', 'Publish', 'Delete'], ['Archive']],
            [published.title, ['View', 'Participants of', 'Edit', 'Archive', 'Delete'], ['Publish']],
            [archived.title, ['View', 'Participants of', 'Delete'], ['Edit', 'Publish', 'Archive']],
        ] as const;
        for (const [title, present, absent] of expected) {
            await showOnly(page, 'admin', title);
            for (const action of present) await expect(page.getByRole('button', { name: `${action} ${title}`, exact: true })).toBeVisible();
            for (const action of absent) await expect(page.getByRole('button', { name: `${action} ${title}`, exact: true })).toHaveCount(0);
        }

        await showOnly(page, 'admin', published.title);
        await page.getByRole('button', { name: `View ${published.title}`, exact: true }).click();
        await expect(page.getByRole('dialog').getByRole('button', { name: 'Delete' })).toBeVisible();
    });

    test('Open status and guest detail', async ({ page }) => {
        const event = await createEvent(page, 'admin', { ...soonest(), publish: true });
        const id = await eventIdOf(page, 'admin', event.title);
        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Published and accepting registrations.');

        await asGuest(page);
        await page.goto(`/events/${id}`);
        const main = page.getByRole('main');
        await expect(page.getByRole('heading', { name: event.title })).toBeVisible();
        await expect(main).toContainText('Open');
        await expect(main).toContainText('Palma Hall');
    });

    test('Student sees published events only', async ({ page }) => {
        const draft = await createEvent(page, 'admin', soonest());
        const published = await createEvent(page, 'admin', { ...soonest(), publish: true });
        const id = await eventIdOf(page, 'admin', published.title);

        await signIn(page, 'student');
        await page.goto('/events');
        await expect(page.getByText(published.title)).toBeVisible();
        await expect(page.getByText(draft.title)).toHaveCount(0);
        await expect(page.getByRole('link', { name: 'Upcoming events' }).first()).toBeVisible();
        await expect(page.getByRole('link', { name: 'My events' }).first()).toBeVisible();

        await page.goto(`/events/${id}`);
        await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible();
    });

    test('Full status after last slot is taken', async ({ page }) => {
        const event = await createEvent(page, 'admin', { publish: true, max: '1' });
        const id = await eventIdOf(page, 'admin', event.title);

        await registerAsStudent(page, id);
        await expect(page.getByText('1 of 1 slots taken')).toBeVisible();
        await expect(page.getByRole('main')).toContainText('Full');

        await signIn(page, 'admin');
        await showOnly(page, 'admin', event.title);
        const row = page.getByRole('row').filter({ hasText: event.title });
        await expect(row).toContainText('1 / 1');
        await expect(row).toContainText('Full');

        await eventIdOf(page, 'admin', event.title);
        await expect(page.getByRole('main')).toContainText('Stu Student');
        await expect(page.getByRole('main')).toContainText('26-99-001');
        await page.getByRole('link', { name: 'Check-in QR' }).click();
        await expect(page.getByText('The check-in code is shown only while the event is ongoing.')).toBeVisible();
    });
});
