// Event dates arrive as local wall-clock strings (Asia/Manila):
// "2026-11-20", "09:00" and "2026-11-18T17:00". They are parsed as local
// parts, never through a timezone, so the shown time is the stored time.

function parts(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(
        String(value ?? ''),
    );

    if (!match) return null;

    const [, year, month, day, hour = '0', minute = '0'] = match;

    return new Date(+year, +month - 1, +day, +hour, +minute);
}

export function formatEventDate(value, options = {}) {
    const date = parts(value);

    if (!date) return 'No date';

    return date.toLocaleDateString('en-PH', {
        weekday: options.weekday ?? undefined,
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

export function formatTime(value) {
    const match = /^(\d{2}):(\d{2})/.exec(String(value ?? ''));

    if (!match) return '';

    const hour = +match[1];
    const suffix = hour >= 12 ? 'PM' : 'AM';

    return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

export function formatTimeRange(start, end) {
    return [formatTime(start), formatTime(end)].filter(Boolean).join(' – ');
}

export function formatDateTime(value) {
    const date = parts(value);

    if (!date) return 'Not set';

    return `${formatEventDate(value)}, ${formatTime(String(value).slice(11, 16))}`;
}

export function locationLabel(location) {
    if (!location) return 'No location';

    const details = [
        location.building,
        location.floor && `Floor ${location.floor}`,
        location.room_number && `Room ${location.room_number}`,
    ].filter(Boolean);

    return details.length
        ? `${location.location_name} · ${details.join(', ')}`
        : location.location_name;
}

// Lifecycle labels from Event::lifecycleStatus() (questionnaire Q23).
export const lifecycleStyles = {
    Draft: 'bg-slate-100 text-slate-700 ring-slate-200',
    Open: 'bg-teal-50 text-teal-700 ring-teal-200',
    Full: 'bg-amber-50 text-amber-800 ring-amber-200',
    Closed: 'bg-orange-50 text-orange-700 ring-orange-200',
    Ongoing: 'bg-blue-50 text-blue-700 ring-blue-200',
    Completed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    Archived: 'bg-slate-100 text-slate-500 ring-slate-200',
};

export const lifecycleDescriptions = {
    Draft: 'Not visible to students or guests yet.',
    Open: 'Published and accepting registrations.',
    Full: 'Published; the participant limit has been reached.',
    Closed: 'Published; the registration deadline has passed.',
    Ongoing: 'The event is happening now.',
    Completed: 'The event has ended.',
    Archived: 'Kept for records and hidden from public lists.',
};

// Proof photo states (questionnaire Q28). PENDING is split for display:
// without a photo the student still has to upload; with one it waits for
// a reviewer.
export function proofLabel(status, hasPhoto) {
    if (status === 'PENDING') {
        return hasPhoto ? 'Waiting for approval' : 'Photo needed';
    }

    return (
        {
            NOT_REQUIRED: 'Not required',
            APPROVED: 'Approved',
            REJECTED: 'Rejected',
            EXPIRED: 'Expired',
        }[status] ?? status
    );
}

export function proofStyle(status, hasPhoto) {
    if (status === 'PENDING') {
        return hasPhoto
            ? 'bg-blue-50 text-blue-700 ring-blue-200'
            : 'bg-amber-50 text-amber-800 ring-amber-200';
    }

    return (
        {
            NOT_REQUIRED: 'bg-slate-100 text-slate-600 ring-slate-200',
            APPROVED: 'bg-teal-50 text-teal-700 ring-teal-200',
            REJECTED: 'bg-red-50 text-red-700 ring-red-200',
            EXPIRED: 'bg-slate-100 text-slate-500 ring-slate-200',
        }[status] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
    );
}

// Attendance from EventRegistration::effectiveAttendanceStatus() (DFD 5.6).
export const attendanceLabels = {
    PENDING: 'Pending',
    ATTENDED: 'Attended',
    ABSENT: 'Absent',
    INCOMPLETE: 'Incomplete',
};

export const attendanceStyles = {
    PENDING: 'bg-slate-100 text-slate-600 ring-slate-200',
    ATTENDED: 'bg-teal-50 text-teal-700 ring-teal-200',
    ABSENT: 'bg-red-50 text-red-700 ring-red-200',
    INCOMPLETE: 'bg-amber-50 text-amber-800 ring-amber-200',
};
