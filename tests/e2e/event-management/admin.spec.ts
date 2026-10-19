// spec: tests/e2e/specs/event-management.md (1. Admin event management)
// seed: tests/e2e/seed.spec.ts
import {
    confirmAction,
    createEvent,
    displayDate,
    eventData,
    eventIdOf,
    fillEventForm,
    registerAsStudent,
    showOnly,
    tabCount,
    toast,
} from '../support/events';
import { expect, signIn, test } from '../support/fixtures';

test.describe('Admin event management', () => {
    test.skip(({ isMobile }) => isMobile, 'Desktop covers this; faculty.spec.ts checks the phone layout.');

    test.beforeEach(async ({ page }) => {
        await signIn(page, 'admin');
    });

    test('Page header', async ({ page }) => {
        await page.goto('/admin/events');

        await expect(page.getByRole('heading', { name: 'Events', exact: true })).toBeVisible();
        await expect(page.getByText('Create, publish, and manage every CCS event.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Create event' }).first()).toBeVisible();
    });

    test('Create draft', async ({ page }) => {
        const event = await createEvent(page, 'admin');

        await expect(page.getByRole('dialog', { name: 'Create event' })).toBeHidden();
        await expect(page).toHaveURL(/view=drafts/);
        await expect(page).not.toHaveURL(/create=1/);
        const row = page.getByRole('row').filter({ hasText: event.title });
        await expect(row).toContainText('by Ada Admin');
        await expect(row).toContainText(displayDate(event.date));
        await expect(row).toContainText('9:00 AM – 11:00 AM');
        await expect(row).toContainText('Palma Hall');
        await expect(row).toContainText('0 / 30');
        await expect(row).toContainText('Draft');
    });

    test('Create and publish', async ({ page }) => {
        const event = await createEvent(page, 'admin', { publish: true });

        await expect(page).toHaveURL(/view=published/);
        // Lifecycle badge: a published event still taking registrations reads "Open".
        await expect(page.getByRole('row').filter({ hasText: event.title })).toContainText('Open');
    });

    test('Proof photo required saves and shows window', async ({ page }) => {
        const event = eventData();
        await page.goto('/admin/events?create=1');
        const dialog = page.getByRole('dialog', { name: 'Create event' });
        await fillEventForm(dialog, event);
        await dialog.getByLabel('Require a proof photo').check();
        await dialog.getByLabel('Uploads open').fill(`${event.date}T09:00`);
        await dialog.getByLabel('Uploads close').fill(`${event.date}T18:00`);
        await dialog.getByRole('button', { name: 'Save as draft' }).click();
        await expect(toast(page, 'Event saved as draft successfully.')).toBeVisible();

        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        const day = displayDate(event.date);
        await expect(page.getByRole('dialog')).toContainText(`Required · uploads ${day}, 9:00 AM to ${day}, 6:00 PM`);
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const edit = page.getByRole('dialog', { name: 'Edit event' });
        await expect(edit.getByLabel('Require a proof photo')).toBeChecked();
        await expect(edit.getByLabel('Uploads open')).toHaveValue(`${event.date}T09:00`);
        await expect(edit.getByLabel('Uploads close')).toHaveValue(`${event.date}T18:00`);
    });

    test('Edit a draft', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        const renamed = `${event.title} renamed`;

        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit event' });
        await dialog.getByLabel('Event title').fill(renamed);
        await dialog.getByLabel('Max participants').fill('40');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(toast(page, 'Event updated successfully.')).toBeVisible();

        await showOnly(page, 'admin', renamed);
        const row = page.getByRole('row').filter({ hasText: renamed });
        await expect(row).toContainText('0 / 40');
        await expect(row).toContainText('Draft');
    });

    test('Edit a published event keeps it Published', async ({ page }) => {
        const event = await createEvent(page, 'admin', { publish: true });

        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit event' });
        await dialog.getByLabel('Description').fill('Updated description from the browser test.');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(toast(page, 'Event updated successfully.')).toBeVisible();

        await page.goto(`/admin/events?view=published&q=${encodeURIComponent(event.title)}`);
        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        await expect(page.getByRole('dialog')).toContainText('Updated description from the browser test.');
    });

    test('Edit event with registrations restricts proof and capacity', async ({ page }) => {
        const event = await createEvent(page, 'admin', { publish: true, max: '1' });
        const id = await eventIdOf(page, 'admin', event.title);
        await registerAsStudent(page, id);

        await signIn(page, 'admin');
        await showOnly(page, 'admin', event.title);
        await page.getByRole('button', { name: `Edit ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Edit event' });
        await expect(dialog.getByLabel('Require a proof photo')).toBeDisabled();
        await expect(dialog.getByText('Fixed because 1 student has already registered.')).toBeVisible();

        await dialog.getByLabel('Max participants').fill('0');
        await dialog.getByRole('button', { name: 'Save changes' }).click();
        await expect(dialog.getByText('Max participants cannot be lower than the 1 students already registered.')).toBeVisible();
        await expect(dialog).toBeVisible();
    });

    test('View details', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        await showOnly(page, 'admin', event.title);

        await page.getByRole('button', { name: `View ${event.title}`, exact: true }).click();
        const dialog = page.getByRole('dialog');
        for (const text of [event.title, 'Palma Hall', 'Not required', 'Ada Admin', event.target, event.description]) {
            await expect(dialog).toContainText(text);
        }
        await page.keyboard.press('Escape');
        await expect(dialog).toBeHidden();

        await page.getByRole('button', { name: `${event.title} by Ada Admin` }).click();
        await expect(page.getByRole('dialog')).toContainText(event.title);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
    });

    test('Tabs and counts', async ({ page }) => {
        await page.goto('/admin/events');
        const before = {
            all: await tabCount(page, 'All events'),
            drafts: await tabCount(page, 'Drafts'),
            published: await tabCount(page, 'Published'),
            archived: await tabCount(page, 'Archived'),
        };
        const prefix = `Tabs ${Date.now()}`;
        const draft = await createEvent(page, 'admin', { title: `${prefix} draft` });
        const published = await createEvent(page, 'admin', { title: `${prefix} published`, publish: true });
        const archived = await createEvent(page, 'admin', { title: `${prefix} archived`, publish: true });
        await showOnly(page, 'admin', archived.title);
        await confirmAction(page, 'Archive', archived.title);

        await page.goto(`/admin/events?view=all&q=${encodeURIComponent(prefix)}`);
        expect(await tabCount(page, 'All events')).toBe(before.all + 3);
        expect(await tabCount(page, 'Drafts')).toBe(before.drafts + 1);
        expect(await tabCount(page, 'Published')).toBe(before.published + 1);
        expect(await tabCount(page, 'Archived')).toBe(before.archived + 1);

        const tabs = [
            ['Drafts', 'drafts', draft.title],
            ['Published', 'published', published.title],
            ['Archived', 'archived', archived.title],
        ] as const;
        for (const [tab, view, title] of tabs) {
            await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).click();
            await expect(page).toHaveURL(new RegExp(`view=${view}`));
            for (const other of [draft.title, published.title, archived.title]) {
                const button = page.getByRole('button', { name: `View ${other}`, exact: true });
                await (other === title ? expect(button).toBeVisible() : expect(button).toBeHidden());
            }
        }
    });

    test('Search', async ({ page }) => {
        const stamp = Date.now();
        const alpha = await createEvent(page, 'admin', { title: `Alpha ${stamp}` });
        const beta = await createEvent(page, 'admin', { title: `Beta ${stamp}`, publish: true });
        const viewAlpha = page.getByRole('button', { name: `View ${alpha.title}`, exact: true });
        const viewBeta = page.getByRole('button', { name: `View ${beta.title}`, exact: true });

        await page.goto('/admin/events?view=all');
        const drafts = await tabCount(page, 'Drafts');
        const search = page.getByRole('searchbox', { name: 'Search events by title' });

        await search.fill(alpha.title);
        await expect(page).toHaveURL(/q=Alpha/);
        await expect(viewAlpha).toBeVisible();
        await expect(viewBeta).toBeHidden();

        await search.fill(`zzzz ${stamp}`);
        await expect(page.getByText('No events match your search')).toBeVisible();
        await expect(page.getByText('Try a different title or clear the search.')).toBeVisible();
        expect(await tabCount(page, 'Drafts')).toBe(drafts);

        await search.fill('');
        await expect(page).not.toHaveURL(/q=/);
        await expect(viewAlpha).toBeVisible();
        await expect(viewBeta).toBeVisible();

        await page.getByRole('tab', { name: /^Published/ }).click();
        await search.fill(String(stamp));
        await expect(viewBeta).toBeVisible();
        await expect(viewAlpha).toBeHidden();
    });

    test('Delete with confirmation', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        await showOnly(page, 'admin', event.title);
        const all = await tabCount(page, 'All events');
        const deleteButton = page.getByRole('button', { name: `Delete ${event.title}`, exact: true });

        await deleteButton.click();
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toContainText('Delete event?');
        await expect(dialog).toContainText(`You are about to permanently delete ${event.title}.`);
        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await expect(dialog).toBeHidden();
        await expect(deleteButton).toBeVisible();

        await confirmAction(page, 'Delete', event.title);
        await expect(deleteButton).toBeHidden();
        expect(await tabCount(page, 'All events')).toBe(all - 1);
    });

    test('Participants page', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        const id = await eventIdOf(page, 'admin', event.title);

        await expect(page).toHaveURL(new RegExp(`/admin/events/${id}/participants`));
        await expect(page).toHaveTitle(`Participants · ${event.title} - CCS Connect`);
        await expect(page.getByRole('link', { name: 'Check-in QR' })).toBeVisible();
        const main = page.getByRole('main');
        await expect(main).toContainText(/registered\s*0 \/ 30/i);
        for (const filter of ['All', 'Attended', 'Pending', 'Absent', 'Incomplete']) await expect(main).toContainText(filter);
        await expect(page.getByText('No students have registered yet')).toBeVisible();
    });

    test('Generate participation report', async ({ page }) => {
        const event = await createEvent(page, 'admin');
        await eventIdOf(page, 'admin', event.title);

        await page.getByRole('button', { name: 'Generate report' }).click();
        await page.getByRole('alertdialog').getByRole('button', { name: 'Generate' }).click();

        const dialog = page.getByRole('dialog', { name: event.title });
        const preview = dialog.frameLocator('iframe');
        await expect(preview.getByRole('heading', { name: 'Event Participation Report' })).toBeVisible();
        await expect(preview.locator('body')).toContainText(event.title);
        await expect(preview.locator('body')).toContainText('Palma Hall');
        await expect(preview.getByText('No students have registered.')).toBeVisible();

        for (const [button, extension] of [['Export PDF', 'pdf'], ['Export Excel', 'xlsx']]) {
            const download = page.waitForEvent('download');
            await dialog.getByRole('link', { name: button }).click();
            expect((await download).suggestedFilename()).toMatch(new RegExp(`^participation-report-\\d+-.+\\.${extension}$`));
        }
    });

    test('Check-in screen for draft or future event shows no QR', async ({ page }) => {
        const draft = await createEvent(page, 'admin');
        const published = await createEvent(page, 'admin', { publish: true });

        for (const [event, badge] of [[draft, 'Draft'], [published, 'Open']] as const) {
            const id = await eventIdOf(page, 'admin', event.title);
            await page.getByRole('link', { name: 'Check-in QR' }).click();
            await expect(page).toHaveURL(new RegExp(`/admin/events/${id}/check-in`));
            const main = page.getByRole('main');
            await expect(main).toContainText(/QR check-in/i);
            await expect(main).toContainText(event.title);
            await expect(main).toContainText(badge);
            await expect(page.getByText('The check-in code is shown only while the event is ongoing.')).toBeVisible();
            await expect(page.getByText('No one has checked in yet.')).toBeVisible();
            await expect(page.getByRole('link', { name: 'Participants' })).toBeVisible();
        }
    });

    test('Create link and create=1 modal', async ({ page }) => {
        const dialog = page.getByRole('dialog', { name: 'Create event' });
        const closers = [
            () => dialog.getByRole('button', { name: 'Close event form' }).click(),
            () => page.keyboard.press('Escape'),
            () => dialog.getByRole('button', { name: 'Cancel' }).click(),
        ];

        for (const close of closers) {
            await page.goto('/admin/events?create=1');
            await expect(dialog).toBeVisible();
            await close();
            await expect(dialog).toBeHidden();
            await expect(page.getByRole('alertdialog')).toBeHidden();
            await expect(page).not.toHaveURL(/create=1/);
        }

        await page.getByRole('link', { name: 'Create Event' }).click();
        await expect(dialog).toBeVisible();
    });

    test('Discard changes prompt', async ({ page }) => {
        await page.goto('/admin/events?create=1');
        const dialog = page.getByRole('dialog', { name: 'Create event' });
        await dialog.getByLabel('Event title').fill('Unsaved title');

        await dialog.getByRole('button', { name: 'Cancel' }).click();
        const prompt = page.getByRole('alertdialog');
        await expect(prompt).toContainText('Discard changes?');
        await expect(prompt).toContainText('Your unsaved changes to this event will be lost.');
        await prompt.getByRole('button', { name: 'Cancel' }).click();
        await expect(prompt).toBeHidden();
        await expect(dialog.getByLabel('Event title')).toHaveValue('Unsaved title');

        await dialog.getByRole('button', { name: 'Cancel' }).click();
        await prompt.getByRole('button', { name: 'Discard' }).click();
        await expect(dialog).toBeHidden();
    });
});
