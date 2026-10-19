// Client-side mirror of the schedule rules in EventFormRequest. The server
// stays authoritative; these give instant feedback and drive the pickers'
// min/max so invalid values cannot be chosen in the first place.
//
// All values are fixed-width local strings in CCS time (Asia/Manila):
// "2026-11-20", "09:00", "2026-11-18T17:00". Same-format strings compare
// correctly as text, so no Date/timezone conversion is involved.

export const CCS_TIMEZONE = 'Asia/Manila';

/**
 * The current CCS wall-clock time as "YYYY-MM-DDTHH:MM", whatever the
 * device's own timezone is. The server compares against this clock too.
 */
export function ccsNow(date = new Date()) {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', {
            timeZone: CCS_TIMEZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(date)
            .map(({ type, value }) => [type, value]),
    );

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** Event start as "YYYY-MM-DDTHH:MM", or null until date and time are set. */
export function eventStart(data) {
    return data.event_date && data.start_time
        ? `${data.event_date}T${data.start_time.slice(0, 5)}`
        : null;
}

/**
 * Whether a schedule field must be checked against "now". Unchanged values
 * of an existing event are not, so a past event can still be corrected
 * (same rule as EventFormRequest::changed()).
 */
function changed(field, data, original) {
    return !original || original[field] !== data[field];
}

/**
 * @param {Record<string, any>} data form data
 * @param {{ editing?: boolean, original?: Record<string, any> | null, now?: string }} options
 * @returns {Record<string, string>} field => message
 */
export function validateSchedule(data, { editing = false, original = null, now = ccsNow() } = {}) {
    const errors = {};
    const startsAt = eventStart(data);

    if (data.start_time && data.end_time && data.end_time <= data.start_time) {
        errors.end_time = 'The end time must be after the start time.';
    }

    if (
        startsAt &&
        (changed('event_date', data, original) || changed('start_time', data, original)) &&
        startsAt <= now
    ) {
        errors.event_date = 'The event must start in the future.';
    }

    if (data.registration_deadline) {
        if (startsAt && data.registration_deadline > startsAt) {
            errors.registration_deadline =
                'The registration deadline must be on or before the event start.';
        } else if (
            changed('registration_deadline', data, original) &&
            data.registration_deadline <= now
        ) {
            errors.registration_deadline = 'The registration deadline must be in the future.';
        }
    }

    if (!editing && !data.poster) {
        errors.poster = 'Upload a poster or image for the event.';
    }

    if (data.proof_photo_required) {
        if (!data.proof_upload_start_at) {
            errors.proof_upload_start_at = 'Set when proof photo uploads open.';
        } else if (startsAt && data.proof_upload_start_at < startsAt) {
            errors.proof_upload_start_at = 'Proof uploads cannot open before the event starts.';
        }

        if (!data.proof_upload_end_at) {
            errors.proof_upload_end_at = 'Set when proof photo uploads close.';
        } else if (
            data.proof_upload_start_at &&
            data.proof_upload_end_at <= data.proof_upload_start_at
        ) {
            errors.proof_upload_end_at = 'Proof uploads must close after they open.';
        }
    }

    return errors;
}

/**
 * Picker bounds for the registration deadline: from `now` (for a new or
 * changed deadline) up to the event start. The picker's min is inclusive
 * while the server needs a time strictly after now, so callers pass the
 * next minute.
 */
export function deadlineBounds(data, { original = null, now = ccsNow() } = {}) {
    const startsAt = eventStart(data);
    const keepsStoredValue = original && original.registration_deadline === data.registration_deadline;

    return {
        min: keepsStoredValue ? undefined : now,
        max: startsAt ?? undefined,
    };
}
