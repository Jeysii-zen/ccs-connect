import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isEventActionActive } from '../../resources/js/lib/eventNavigation.js';

const url = (path) => new URL(path, 'http://ccs.test');

// Mirrors the Events actions in AdminConnectLayout.jsx.
const actions = {
    'All Events': url('/admin/events'),
    Drafts: url('/admin/events?view=drafts'),
    Published: url('/admin/events?view=published'),
    Archived: url('/admin/events?view=archived'),
    'Create Event': url('/admin/events?create=1'),
};

const activeFor = (current) =>
    Object.entries(actions)
        .filter(([, target]) => isEventActionActive(url(current), target))
        .map(([label]) => label);

test('exactly one action is active for each events URL', () => {
    assert.deepEqual(activeFor('/admin/events'), ['All Events']);
    assert.deepEqual(activeFor('/admin/events?view=all'), ['All Events']);
    assert.deepEqual(activeFor('/admin/events?view=drafts'), ['Drafts']);
    assert.deepEqual(activeFor('/admin/events?view=published&page=2'), ['Published']);
    assert.deepEqual(activeFor('/admin/events?view=archived&q=summit'), ['Archived']);
    assert.deepEqual(activeFor('/admin/events?create=1'), ['Create Event']);
});

test('no events action is active on another page', () => {
    assert.deepEqual(activeFor('/admin/announcements?view=drafts'), []);
});
