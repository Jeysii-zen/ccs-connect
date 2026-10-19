// spec: tests/e2e/specs/event-management.md (3. Validation)
// seed: tests/e2e/seed.spec.ts
import type { Page } from '@playwright/test';
import { createEvent, dayFromNow, eventData, fillEventForm, showOnly, toast } from '../support/events';
import { expect, signIn, test } from '../support/fixtures';

async function openCreate(page: Page) {
    await page.goto('/admin/events?create=1');
    const dialog = page.getByRole('dialog', { name: 'Create event' });
    await expect(dialog).toBeVisible();

    return dialog;
}

test.describe('Event form validation', () => {
    test.skip(({ isMobile }) => isMobile, 'Desktop covers this; faculty.spec.ts checks the phone layout.');

    test.beforeEach(async ({ page }) => {
        await signIn(page, 'admin');
    });

    test('Empty submit', async ({ page }) => {
        const dialog = await openCreate(page);
        let posts = 0;
        page.on('request', (request) => {
            if (request.method() === 'POST' && new URL(request.url()).pathname === '/admin/events') posts++;
        });

        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('Upload a poster or image for the event.')).toBeVisible();
        await expect(dialog.getByText('Please fix the highlighted fields.')).toBeVisible();
        expect(posts, 'client errors must block the request').toBe(0);

        await fillEventForm(dialog, { poster: true });
        // fillEventForm picks the location; clear it to see the server's required error.
        await dialog.getByLabel('Location').selectOption('');
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        for (const field of [
            'title',
            'description',
            'event date',
            'start time',
            'end time',
            'registration deadline',
            'location id',
            'target participants',
            'max participants',
        ]) {
            await expect(dialog.getByText(`The ${field} field is required.`)).toBeVisible();
        }
        await expect(dialog).toBeVisible();
    });

    test('End time not after start', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData({ start: '09:00', end: '08:00' }));
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The end time must be after the start time.')).toBeVisible();

        await dialog.getByLabel('End time').fill('09:00');
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The end time must be after the start time.')).toBeVisible();
    });

    test('Start in the past', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData({ date: dayFromNow(-9), deadline: `${dayFromNow(-10)}T09:00` }));
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The event must start in the future.')).toBeVisible();

        // Today, already started (00:00 has always passed).
        await fillEventForm(dialog, { date: dayFromNow(0), start: '00:00', end: '00:30' });
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The event must start in the future.')).toBeVisible();
        await expect(dialog).toBeVisible();
    });

    test('Deadline after start', async ({ page }) => {
        const dialog = await openCreate(page);
        const event = eventData();
        await fillEventForm(dialog, { ...event, deadline: `${event.date}T10:00` });
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The registration deadline must be on or before the event start.')).toBeVisible();
    });

    test('Deadline in the past', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData({ deadline: `${dayFromNow(-18)}T10:00` }));
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(dialog.getByText('The registration deadline must be in the future.')).toBeVisible();
    });

    test('Max participants limits', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData());
        const cases = [
            ['0', 'The max participants field must be at least 1.'],
            ['-1', 'The max participants field must be at least 1.'],
            ['100001', 'The max participants field must not be greater than 100000.'],
            ['2.5', 'The max participants field must be an integer.'],
        ] as const;

        for (const [value, message] of cases) {
            await dialog.getByLabel('Max participants').fill(value);
            // Same message twice in a row, so wait for this submit's own response.
            const response = page.waitForResponse(
                (r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/admin/events',
            );
            await dialog.getByRole('button', { name: 'Save as draft' }).click();
            await response;
            await expect(dialog.getByText(message)).toBeVisible();
            await expect(dialog).toBeVisible();
        }
    });

    test('Title is limited to 255 characters', async ({ page }) => {
        const dialog = await openCreate(page);
        const title = dialog.getByLabel('Event title');
        await expect(title).toHaveAttribute('maxlength', '255');

        await title.fill('a'.repeat(300));
        expect((await title.inputValue()).length).toBe(255);
        await title.press('End');
        await title.pressSequentially('bbb');
        expect((await title.inputValue()).length).toBe(255);
    });

    test('Poster must be an image', async ({ page }) => {
        const dialog = await openCreate(page);
        await dialog.locator('input[type=file]').setInputFiles({ name: 'a.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') });

        await expect(dialog.getByText('The poster must be a JPG, PNG or WEBP image.')).toBeVisible();
        await expect(dialog.getByAltText('Poster preview')).toHaveCount(0);
    });

    test('Proof required with empty window', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData());
        await dialog.getByLabel('Require a proof photo').check();
        await dialog.getByRole('button', { name: 'Save as draft' }).click();

        await expect(dialog.getByText('Set when proof photo uploads open.')).toBeVisible();
        await expect(dialog.getByText('Set when proof photo uploads close.')).toBeVisible();
    });

    test('Proof opens before event start', async ({ page }) => {
        const dialog = await openCreate(page);
        const event = eventData();
        await fillEventForm(dialog, event);
        await dialog.getByLabel('Require a proof photo').check();
        await dialog.getByLabel('Uploads open').fill(`${event.date}T08:00`);
        await dialog.getByLabel('Uploads close').fill(`${event.date}T18:00`);
        await dialog.getByRole('button', { name: 'Save as draft' }).click();

        await expect(dialog.getByText('Proof uploads cannot open before the event starts.')).toBeVisible();
    });

    test('Proof closes at or before opening', async ({ page }) => {
        const dialog = await openCreate(page);
        const event = eventData();
        await fillEventForm(dialog, event);
        await dialog.getByLabel('Require a proof photo').check();
        await dialog.getByLabel('Uploads open').fill(`${event.date}T12:00`);

        for (const close of ['12:00', '11:00']) {
            await dialog.getByLabel('Uploads close').fill(`${event.date}T${close}`);
            await dialog.getByRole('button', { name: 'Save as draft' }).click();
            await expect(dialog.getByText('Proof uploads must close after they open.')).toBeVisible();
        }
    });

    test('Proof toggled off after filling window', async ({ page }) => {
        const dialog = await openCreate(page);
        const event = eventData();
        await fillEventForm(dialog, event);
        const proof = dialog.getByLabel('Require a proof photo');
        await proof.check();
        await dialog.getByLabel('Uploads open').fill(`${event.date}T09:00`);
        await dialog.getByLabel('Uploads close').fill(`${event.date}T18:00`);
        await proof.uncheck();

        await expect(dialog.getByLabel('Uploads open')).toHaveCount(0);
        await expect(dialog.getByLabel('Uploads close')).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(toast(page, 'Event saved as draft successfully.')).toBeVisible();

        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Not required');
    });

    test('Edit: clearing the title', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit event' });

        await dialog.getByLabel('Event title').fill('');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(dialog.getByText('The title field is required.')).toBeVisible();
        await expect(dialog.getByLabel('Event title')).toHaveAttribute('aria-invalid', 'true');
        await expect(dialog).toBeVisible();
    });

    test('Errors clear after fixing', async ({ page }) => {
        const dialog = await openCreate(page);
        await fillEventForm(dialog, eventData({ end: '08:00' }));
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        const error = dialog.getByText('The end time must be after the start time.');
        await expect(error).toBeVisible();

        await dialog.getByLabel('End time').fill('11:00');
        await expect(error).toBeHidden();
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(toast(page, 'Event saved as draft successfully.')).toBeVisible();
    });
});
