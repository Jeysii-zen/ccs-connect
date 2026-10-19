import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
    ccsNow,
    deadlineBounds,
    eventStart,
    validateSchedule,
} from '../../resources/js/lib/eventSchedule.js';

const NOW = '2026-11-01T08:00';

const valid = {
    event_date: '2026-11-20',
    start_time: '09:00',
    end_time: '12:00',
    registration_deadline: '2026-11-18T17:00',
    poster: {},
    proof_photo_required: false,
};

const errorsFor = (overrides, options = {}) =>
    validateSchedule({ ...valid, ...overrides }, { now: NOW, ...options });

test('ccsNow reports Manila time whatever the device timezone is', () => {
    // 2026-11-01 00:30 UTC is 08:30 in Manila (UTC+8, no DST).
    assert.equal(ccsNow(new Date(Date.UTC(2026, 10, 1, 0, 30))), '2026-11-01T08:30');
    // Crosses midnight: 2026-11-01 18:00 UTC is 02:00 the next day in Manila.
    assert.equal(ccsNow(new Date(Date.UTC(2026, 10, 1, 18, 0))), '2026-11-02T02:00');
});

test('a valid schedule has no errors', () => {
    assert.deepEqual(errorsFor({}), {});
});

test('a deadline exactly at the event start is allowed', () => {
    assert.deepEqual(errorsFor({ registration_deadline: '2026-11-20T09:00' }), {});
});

test('a deadline after the event start is rejected', () => {
    // The original report: 5 PM on the day of a 9 AM event.
    assert.match(
        errorsFor({ registration_deadline: '2026-11-20T17:00' }).registration_deadline,
        /on or before the event start/,
    );
});

test('a deadline that is not in the future is rejected', () => {
    assert.match(errorsFor({ registration_deadline: NOW }).registration_deadline, /in the future/);
    assert.match(
        errorsFor({ registration_deadline: '2026-10-31T17:00' }).registration_deadline,
        /in the future/,
    );
    assert.deepEqual(errorsFor({ registration_deadline: '2026-11-01T08:01' }), {});
});

test('an unchanged past deadline is not re-checked when editing', () => {
    const original = { ...valid, event_date: '2026-10-20', registration_deadline: '2026-10-18T17:00' };

    assert.deepEqual(
        validateSchedule(
            { ...original, description: 'Corrected' },
            { editing: true, original, now: NOW },
        ),
        {},
    );
});

test('picker bounds run from now to the event start', () => {
    assert.deepEqual(deadlineBounds(valid, { now: NOW }), { min: NOW, max: '2026-11-20T09:00' });
    assert.deepEqual(deadlineBounds({ ...valid, start_time: '' }, { now: NOW }), {
        min: NOW,
        max: undefined,
    });
    // A kept stored deadline may already be in the past.
    assert.equal(deadlineBounds(valid, { original: valid, now: NOW }).min, undefined);
});

test('event start ignores seconds', () => {
    assert.equal(eventStart({ event_date: '2026-11-20', start_time: '09:00:00' }), '2026-11-20T09:00');
});
