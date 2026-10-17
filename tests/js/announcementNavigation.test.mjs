import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isAnnouncementActionActive } from '../../resources/js/lib/announcementNavigation.js';

const url = (path) => new URL(path, 'http://ccs.test');

// Mirrors the Announcements actions in AdminConnectLayout.jsx.
const actions = {
    Announcements: url('/admin/announcements?view=announcements'),
    Drafts: url('/admin/announcements?view=drafts'),
    Schedule: url('/admin/announcements?view=schedule'),
};

const activeFor = (current) =>
    Object.entries(actions)
        .filter(([, target]) => isAnnouncementActionActive(url(current), target))
        .map(([label]) => label);

test('exactly one action is active for each announcements URL', () => {
    assert.deepEqual(activeFor('/admin/announcements'), ['Announcements']);
    assert.deepEqual(activeFor('/admin/announcements?view=announcements'), ['Announcements']);
    assert.deepEqual(activeFor('/admin/announcements?view=drafts'), ['Drafts']);
    assert.deepEqual(activeFor('/admin/announcements?view=schedule'), ['Schedule']);
});

test('pagination and the create parameter do not change the active action', () => {
    assert.deepEqual(activeFor('/admin/announcements?view=drafts&page=3'), ['Drafts']);
    assert.deepEqual(activeFor('/admin/announcements?create=1'), ['Announcements']);
});

test('no announcements action is active on another page', () => {
    assert.deepEqual(activeFor('/admin/accounts?view=drafts'), []);
});
