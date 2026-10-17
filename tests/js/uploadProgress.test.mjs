import assert from 'node:assert/strict';
import { test } from 'node:test';

import { describeSubmission } from '../../resources/js/lib/uploadProgress.js';

// Shapes match the progress events Inertia 3 passes to useForm.
const progressAt = (fraction) => ({
    progress: fraction,
    percentage: Math.round(fraction * 100),
    loaded: fraction * 1000,
    total: 1000,
});

test('nothing is shown when no request is running', () => {
    assert.equal(describeSubmission(false, null), null);
    // Inertia clears progress on finish; a stale value must not show either.
    assert.equal(describeSubmission(false, progressAt(1)), null);
});

test('a request with no upload event yet starts at 0%', () => {
    assert.deepEqual(describeSubmission(true, null), {
        phase: 'starting',
        percentage: 0,
    });
});

test('upload percentage follows the real progress events', () => {
    const seen = [0, 0.25, 0.5, 0.9].map(
        (fraction) => describeSubmission(true, progressAt(fraction)).percentage,
    );

    assert.deepEqual(seen, [0, 25, 50, 90]);
});

test('an almost-finished upload is never reported as 100%', () => {
    assert.deepEqual(describeSubmission(true, progressAt(0.996)), {
        phase: 'uploading',
        percentage: 99,
    });
});

test('a completed upload reads 100% while the server is still saving', () => {
    assert.deepEqual(describeSubmission(true, progressAt(1)), {
        phase: 'processing',
        percentage: 100,
    });
});

test('an upload of unknown size is shown without a percentage', () => {
    const unknown = { progress: undefined, percentage: 0, loaded: 512, total: undefined };

    assert.deepEqual(describeSubmission(true, unknown), {
        phase: 'uploading',
        percentage: null,
    });
});

test('a full submission moves through starting, uploading, processing, done', () => {
    const timeline = [
        [true, null],
        [true, progressAt(0.4)],
        [true, progressAt(1)],
        [false, null],
    ].map(([processing, progress]) => {
        const state = describeSubmission(processing, progress);

        return state ? `${state.phase} ${state.percentage}%` : 'idle';
    });

    assert.deepEqual(timeline, [
        'starting 0%',
        'uploading 40%',
        'processing 100%',
        'idle',
    ]);
});

test('the percentage never decreases as upload events arrive', () => {
    const percentages = [0.1, 0.33, 0.67, 0.99, 1].map(
        (fraction) => describeSubmission(true, progressAt(fraction)).percentage,
    );

    assert.deepEqual(percentages, [...percentages].sort((a, b) => a - b));
});
