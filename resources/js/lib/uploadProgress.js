/**
 * Describe an in-flight form submission from Inertia's useForm state.
 *
 * The percentage is always the real browser upload progress. Once it
 * reaches 100% the server is still saving; that phase keeps the bar full
 * and is labelled separately, since its duration cannot be measured.
 *
 * @param {boolean} processing form.processing
 * @param {{ progress?: number } | null} progress form.progress
 * @returns {{ phase: 'starting' | 'uploading' | 'processing', percentage: number | null } | null}
 */
export function describeSubmission(processing, progress) {
    if (!processing) {
        return null;
    }

    // Request sent, no upload event yet: nothing has been uploaded.
    if (!progress) {
        return { phase: 'starting', percentage: 0 };
    }

    const fraction = progress.progress;

    // The browser could not compute the upload size.
    if (typeof fraction !== 'number') {
        return { phase: 'uploading', percentage: null };
    }

    if (fraction >= 1) {
        return { phase: 'processing', percentage: 100 };
    }

    // Round down so 99.6% is never shown as 100% before the upload ends.
    return {
        phase: 'uploading',
        percentage: Math.max(0, Math.floor(fraction * 100)),
    };
}
