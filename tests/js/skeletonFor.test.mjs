import assert from 'node:assert/strict';
import { test } from 'node:test';

import { skeletonFor } from '../../resources/js/lib/skeletonFor.js';

test('each page loads behind a skeleton shaped like it', () => {
    const cases = {
        '/dashboard': 'dashboard',
        '/profile': 'form',
        '/settings/profile': 'form',
        '/events': 'cards',
        '/my-events': 'cards',
        '/events/12': 'detail',
        '/events/12/check-in': 'detail',
        '/faculty/events/12/check-in': 'detail',
        '/faculty/events': 'table',
        '/faculty/events/12/participants': 'table',
        '/admin/accounts': 'table',
    };

    for (const [path, shape] of Object.entries(cases)) {
        assert.equal(skeletonFor(path), shape, path);
    }
});
