import { expect, type Locator, type Page } from '@playwright/test';
import { signIn } from './fixtures';

export const POSTER = 'tests/e2e/fixtures/poster.png';

export type EventData = {
    title: string;
    description: string;
    date: string; // YYYY-MM-DD
    start: string; // HH:MM
    end: string;
    deadline: string; // YYYY-MM-DDTHH:MM
    target: string;
    max: string;
    poster: boolean;
};

/** YYYY-MM-DD for today + `days` (local time, like the date inputs). */
export function dayFromNow(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Valid event data with a unique title; override any field. */
export function eventData(overrides: Partial<EventData> = {}): EventData {
    return {
        title: `E2E event ${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        description: 'Created by a browser test.',
        date: dayFromNow(30),
        start: '09:00',
        end: '11:00',
        deadline: `${dayFromNow(29)}T09:00`,
        target: 'BSCS 3rd year',
        max: '30',
        poster: true,
        ...overrides,
    };
}

/** Fills the open Create/Edit event dialog; empty strings clear a field. */
export async function fillEventForm(dialog: Locator, data: Partial<EventData>) {
    if (data.title !== undefined) await dialog.getByLabel('Event title').fill(data.title);
    if (data.description !== undefined) await dialog.getByLabel('Description').fill(data.description);
    if (data.date !== undefined) await dialog.getByLabel('Date', { exact: true }).fill(data.date);
    if (data.start !== undefined) await dialog.getByLabel('Start time').fill(data.start);
    if (data.end !== undefined) await dialog.getByLabel('End time').fill(data.end);
    if (data.deadline !== undefined) await dialog.getByLabel('Registration deadline').fill(data.deadline);
    await dialog.getByLabel('Location').selectOption({ label: 'Palma Hall' });
    if (data.target !== undefined) await dialog.getByLabel('Target participants').fill(data.target);
    if (data.max !== undefined) await dialog.getByLabel('Max participants').fill(data.max);
    if (data.poster) await dialog.locator('input[type=file]').setInputFiles(POSTER);
}

/**
 * Creates an event through the UI on the current role's events page
 * (`/admin/events` or `/faculty/events`) and waits for the success toast.
 */
export async function createEvent(page: Page, area: 'admin' | 'faculty', options: { publish?: boolean } & Partial<EventData> = {}) {
    const { publish = false, ...overrides } = options;
    const data = eventData(overrides);

    await page.goto(`/${area}/events`);
    await page.getByRole('button', { name: 'Create event' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Create event' });
    await fillEventForm(dialog, data);
    await dialog.getByRole('button', { name: publish ? 'Save and publish' : 'Save as draft' }).click();
    await expect(
        page.getByRole('status').filter({ hasText: publish ? 'Event published successfully.' : 'Event saved as draft successfully.' }),
    ).toBeVisible();

    return data;
}

/** Headers for a raw state-changing request made with `page.request`. */
export async function xsrfHeaders(page: Page) {
    const token = (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')?.value ?? '';

    return { 'X-XSRF-TOKEN': decodeURIComponent(token), Accept: 'application/json' };
}

export type Area = 'admin' | 'faculty';

/** The success toast with this text. */
export function toast(page: Page, text: string) {
    return page.getByRole('status').filter({ hasText: text });
}

/** Opens the events list showing just this event (any status). */
export async function showOnly(page: Page, area: Area, title: string) {
    await page.goto(`/${area}/events?view=all&q=${encodeURIComponent(title)}`);
    await expect(page.getByRole('button', { name: `View ${title}`, exact: true })).toBeVisible();
}

const PAST = { Publish: 'published', Archive: 'archived', Delete: 'deleted' } as const;

/** Clicks the row's Publish/Archive/Delete button, confirms the dialog and waits for the toast. */
export async function confirmAction(page: Page, verb: keyof typeof PAST, title: string) {
    await page.getByRole('button', { name: `${verb} ${title}`, exact: true }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: `${verb} event` }).click();
    await expect(toast(page, `Event ${PAST[verb]} successfully.`)).toBeVisible();
}

/** The event's id, read from its participants link. Leaves the page on the participants screen. */
export async function eventIdOf(page: Page, area: Area, title: string) {
    await showOnly(page, area, title);
    await page.getByRole('button', { name: `Participants of ${title}`, exact: true }).click();
    await page.waitForURL(/\/events\/\d+\/participants/);

    return Number(page.url().match(/\/events\/(\d+)\/participants/)![1]);
}

/** "Nov 18, 2026" for a YYYY-MM-DD date, as the app displays it. */
export function displayDate(date: string) {
    return new Date(`${date}T00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Signs in as the student and registers for the event. Leaves the student signed in on the event page. */
export async function registerAsStudent(page: Page, id: number) {
    await signIn(page, 'student');
    await page.goto(`/events/${id}`);
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm registration' }).click();
    await expect(page.getByText('You are registered', { exact: true })).toBeVisible();
}

/**
 * Tomorrow morning: sorts before the other tests' events (30 days out) on
 * the public /events list, which shows the soonest first, 9 per page.
 */
export function soonest(): Partial<EventData> {
    return { date: dayFromNow(1), start: '06:00', end: '08:00', deadline: `${dayFromNow(1)}T05:00` };
}

/** Numeric badge of a list tab, e.g. 3 for "Drafts 3". */
export async function tabCount(page: Page, tab: 'All events' | 'Drafts' | 'Published' | 'Archived') {
    const text = await page.getByRole('tab', { name: new RegExp(`^${tab}`) }).textContent();

    return Number(text?.match(/(\d+)\s*$/)?.[1]);
}
