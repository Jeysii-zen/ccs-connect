import EmptyState from '@/components/ui/EmptyState';
import FormModal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/FormModal';
import GlassConfirmDialog, { glassButtonClass } from '@/components/ui/GlassConfirmDialog';
import {
    dangerButtonClass,
    fieldClass,
    ghostButtonClass,
    labelClass,
    primaryButtonClass,
    secondaryButtonClass,
} from '@/components/ui/formStyles';
import Toast from '@/components/ui/Toast';
import AttendanceStatusBadge from '@/components/events/AttendanceStatusBadge';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import ProofStatusBadge from '@/components/events/ProofStatusBadge';
import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import StudentDashboardLayout from '@/layouts/StudentDashboardLayout';
import { attendanceLabels, formatDateTime, formatEventDate, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    Check,
    ChevronLeft,
    ChevronRight,
    Download,
    Eye,
    FileText,
    QrCode,
    RotateCcw,
    UserCheck,
    ShieldCheck,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const filters = [
    { key: 'all', label: 'All' },
    { key: 'review', label: 'Awaiting review' },
    { key: 'missing', label: 'No photo yet' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
];

const attendanceFilters = [
    { key: 'all', label: 'All' },
    { key: 'attended', label: 'Attended' },
    { key: 'pending', label: 'Pending' },
    { key: 'absent', label: 'Absent' },
    { key: 'incomplete', label: 'Incomplete' },
];

function FilterTabs({ label, options, current, onSelect }) {
    return (
        <div className="flex items-center gap-1 overflow-x-auto">
            <span aria-hidden="true" className="mr-2 shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {label}
            </span>
            <div role="tablist" aria-label={label} className="flex gap-1">
            {options.map(({ key, label: optionLabel }) => (
                <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={current === key}
                    onClick={() => onSelect(key)}
                    className={`shrink-0 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                        current === key
                            ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                >
                    {optionLabel}
                </button>
            ))}
            </div>
        </div>
    );
}

/**
 * Proof review (DFD 5.3): approve, or reject with the reason the student
 * will see. The photo is loaded through the authorized proof route.
 */
function ReviewModal({ registration, reviewUrl, canReview, onClose }) {
    const [mode, setMode] = useState('view');
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState('');
    // Archived events are final records: photos can be viewed, not reviewed.
    const reviewable = registration.awaiting_review && canReview;

    const submit = (decision) => {
        if (processing) return;

        if (decision === 'reject' && reason.trim() === '') {
            setError('Give the student a reason for the rejection.');
            return;
        }

        router.patch(
            reviewUrl,
            {
                decision,
                reason: decision === 'reject' ? reason.trim() : undefined,
                proof_version: registration.proof_version,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
                onSuccess: () => onClose(),
                onError: (errors) => setError(errors.proof ?? errors.reason ?? 'The review could not be saved.'),
            },
        );
    };

    return (
        <FormModal size="xl" labelledBy="review-title" busy={processing} onClose={onClose}>
            <ModalHeader
                icon={ShieldCheck}
                eyebrow="Proof review"
                title={registration.student.name}
                titleId="review-title"
                description={`Year ${registration.year_level}, Block ${registration.block}${
                    registration.proof_uploaded_at ? ` · uploaded ${formatDateTime(registration.proof_uploaded_at)}` : ''
                }`}
                onClose={onClose}
                closeDisabled={processing}
                closeLabel="Close proof review"
            />

            <ModalBody className="space-y-4">
                <div className="overflow-hidden rounded-3xl bg-[#020618]/[0.04] ring-1 ring-slate-900/5">
                    <img
                        src={registration.proof_url}
                        alt={`Proof photo from ${registration.student.name}`}
                        className="mx-auto max-h-[45dvh] w-auto object-contain sm:max-h-[50vh]"
                    />
                </div>

                <ProofStatusBadge status={registration.proof_status} hasPhoto />

                {!reviewable && (
                    <p className="text-sm text-slate-500">
                        {registration.proof_reviewer
                            ? `Reviewed by ${registration.proof_reviewer} on ${formatDateTime(registration.proof_reviewed_at)}.`
                            : registration.awaiting_review
                              ? 'This event is archived, so this photo can no longer be reviewed.'
                              : 'This photo is not awaiting review.'}
                        {registration.proof_rejection_reason && ` Reason: ${registration.proof_rejection_reason}`}
                    </p>
                )}

                {reviewable && mode === 'reject' && (
                    <div>
                        <label htmlFor="reject-reason" className={labelClass}>
                            Reason for the student
                        </label>
                        <textarea
                            id="reject-reason"
                            rows={3}
                            maxLength={1000}
                            value={reason}
                            onChange={(event) => {
                                setReason(event.target.value);
                                setError('');
                            }}
                            placeholder="e.g. The event is not visible in the background."
                            className={fieldClass}
                            autoFocus
                        />
                    </div>
                )}

                {error && (
                    <p role="alert" className="flex items-center gap-2 text-sm font-medium text-red-600">
                        <AlertCircle size={16} className="shrink-0" />
                        {error}
                    </p>
                )}
            </ModalBody>

            <ModalFooter>
                {reviewable ? (
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {mode === 'reject' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setMode('view')}
                                    disabled={processing}
                                    className={ghostButtonClass}
                                >
                                    Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submit('reject')}
                                    disabled={processing}
                                    className={dangerButtonClass}
                                >
                                    <X size={16} />
                                    {processing ? 'Rejecting...' : 'Reject photo'}
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setMode('reject')}
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50 sm:py-2.5"
                                >
                                    <X size={16} />
                                    Reject
                                </button>
                                <button
                                    type="button"
                                    onClick={() => submit('approve')}
                                    disabled={processing}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/25 transition hover:from-teal-600 hover:to-emerald-700 disabled:opacity-60 sm:py-2.5"
                                >
                                    <Check size={16} />
                                    {processing ? 'Approving...' : 'Approve'}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex justify-end">
                        <button type="button" onClick={onClose} className={ghostButtonClass}>
                            Close
                        </button>
                    </div>
                )}
            </ModalFooter>
        </FormModal>
    );
}

const attendanceChoices = ['ATTENDED', 'ABSENT', 'INCOMPLETE'];

/**
 * Opens the attendance dialog (questionnaire Q33). Nothing is saved until
 * a choice is clicked there, so keyboard navigation cannot change data.
 */
/**
 * Event Participation Report (Q39/Q40): a preview of the same page the PDF
 * is rendered from, then a PDF or Excel download. Nothing is stored.
 */
function ReportModal({ event, routePrefix, onClose }) {
    const reportUrl = (format) => route(`${routePrefix}.events.report`, [event.event_id, format]);

    return (
        <FormModal size="2xl" labelledBy="report-title" onClose={onClose}>
            <ModalHeader
                icon={FileText}
                eyebrow="Event participation report"
                title={event.title}
                titleId="report-title"
                description="Figures are as of now; attendance follows the Participants list."
                onClose={onClose}
                closeLabel="Close report preview"
            />

            <ModalBody>
                <iframe
                    src={reportUrl('preview')}
                    title={`Participation report preview for ${event.title}`}
                    className="h-[55dvh] w-full rounded-2xl bg-white ring-1 ring-slate-900/10"
                />
            </ModalBody>

            <ModalFooter>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} className={ghostButtonClass}>
                        Close
                    </button>
                    <a href={reportUrl('xlsx')} className={secondaryButtonClass}>
                        <Download size={16} aria-hidden="true" />
                        Export Excel
                    </a>
                    <a href={reportUrl('pdf')} className={primaryButtonClass}>
                        <Download size={16} aria-hidden="true" />
                        Export PDF
                    </a>
                </div>
            </ModalFooter>
        </FormModal>
    );
}

function ChangeAttendanceButton({ registration, onOpen }) {
    return (
        <button
            type="button"
            onClick={() => onOpen(registration)}
            aria-label={`Change attendance of ${registration.student.name}`}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
        >
            <UserCheck size={14} aria-hidden="true" />
            Change
        </button>
    );
}

function attendanceNote(registration) {
    // attendance_version is set exactly when a manual change is in effect.
    if (registration.attendance_version) {
        return `Set by ${registration.attendance_modifier ?? 'a manager'} on ${formatDateTime(registration.attendance_modified_at)}`;
    }

    return registration.checked_in_at ? `Checked in ${formatDateTime(registration.checked_in_at)}` : 'Not checked in';
}

// Faculty manage events inside their dashboard frame (sidebar and top bar),
// with Events highlighted; the dashboard's own content is not included.
function FacultyEventsLayout({ children }) {
    return <StudentDashboardLayout active="Events">{children}</StudentDashboardLayout>;
}

export default function Participants({
    event,
    registrations,
    currentFilter,
    currentAttendance,
    routePrefix,
    canModifyAttendance,
    canReviewProof,
}) {
    const page = usePage();
    const Layout = routePrefix === 'admin' ? AdminConnectLayout : FacultyEventsLayout;
    const items = registrations?.data ?? [];
    const [reviewingId, setReviewingId] = useState(null);
    const [notification, setNotification] = useState(null);
    const [changing, setChanging] = useState(null);
    const [attendanceProcessing, setAttendanceProcessing] = useState(false);
    // Admin workflow: confirm, then preview with export (null when closed).
    const [reportStep, setReportStep] = useState(null);

    // Keep the open review on the refreshed row after a decision.
    const reviewing = items.find((item) => item.registration_id === reviewingId) ?? null;

    useEffect(() => {
        const success = page.props.flash?.success;

        if (success) setNotification({ type: 'success', message: success });
    }, [page.props.flash?.success]);

    const showError = (message) => setNotification({ type: 'error', message });

    // The version sent back makes the server refuse a change made from a
    // stale page.
    const saveAttendance = (choice) => {
        const params = [event.event_id, changing.registration_id];
        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setAttendanceProcessing(true),
            onFinish: () => setAttendanceProcessing(false),
            onSuccess: () => setChanging(null),
            onError: (errors) => {
                setChanging(null);
                showError(
                    errors.attendance ?? errors.attendance_status ?? errors.attendance_version ?? 'Attendance could not be saved.',
                );
            },
        };

        if (choice === 'RESET') {
            router.delete(route(`${routePrefix}.events.participants.attendance.reset`, params), {
                data: { attendance_version: changing.attendance_version },
                ...options,
            });
            return;
        }

        router.patch(
            route(`${routePrefix}.events.participants.attendance.update`, params),
            { attendance_status: choice, attendance_version: changing.attendance_version },
            options,
        );
    };

    // Both filters travel together; "all" is left out of the URL.
    const applyFilters = (changes) => {
        const next = { proof: currentFilter, attendance: currentAttendance, ...changes };

        router.get(
            route(`${routePrefix}.events.participants.index`, event.event_id),
            Object.fromEntries(Object.entries(next).filter(([, value]) => value !== 'all')),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <Layout>
            <Head title={`Participants · ${event.title}`} />

            <div className="mx-auto max-w-7xl pt-5 sm:pt-7">
                <Link
                    href={route(`${routePrefix}.events.index`)}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                    <ArrowLeft size={16} />
                    Events
                </Link>

                <div className="mt-3 mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Event participation</p>
                        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:truncate sm:text-3xl">{event.title}</h1>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                            <EventStatusBadge status={event.lifecycle_status} />
                            {formatEventDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)} ·{' '}
                            {locationLabel(event.location)}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:flex">
                        <Link
                            href={route(`${routePrefix}.events.check-in`, event.event_id)}
                            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 hover:from-blue-700 hover:to-cyan-700 sm:col-span-1"
                        >
                            <QrCode size={18} />
                            Check-in QR
                        </Link>
                        <button
                            type="button"
                            onClick={() => setReportStep('confirm')}
                            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-1"
                        >
                            <FileText size={18} />
                            Generate report
                        </button>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Registered</p>
                            <p className="text-xl font-bold text-slate-900">
                                {event.registered_count}
                                <span className="text-sm font-medium text-slate-400"> / {event.max_participants}</span>
                            </p>
                        </div>
                        {event.proof_photo_required && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-amber-700">To review</p>
                                <p className="text-xl font-bold text-amber-900">{event.pending_review_count}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)]">
                    <div className="space-y-2 border-b border-slate-100 p-4 sm:p-5">
                        <FilterTabs
                            label="Attendance"
                            options={attendanceFilters}
                            current={currentAttendance}
                            onSelect={(attendance) => applyFilters({ attendance })}
                        />
                        {event.proof_photo_required && (
                            <FilterTabs
                                label="Proof"
                                options={filters}
                                current={currentFilter}
                                onSelect={(proof) => applyFilters({ proof })}
                            />
                        )}
                    </div>

                    {items.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title={
                                currentFilter === 'all' && currentAttendance === 'all'
                                    ? 'No students have registered yet'
                                    : 'No students match these filters'
                            }
                            description="Registered students and their proof photos will appear here."
                        />
                    ) : (
                        <>
                        <ul className="divide-y divide-slate-100 md:hidden">
                            {items.map((registration) => (
                                <li key={registration.registration_id} className="flex items-start justify-between gap-3 p-4">
                                    <div className="min-w-0">
                                        <p className="font-semibold text-slate-900">{registration.student.name}</p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {registration.student.student_number && `${registration.student.student_number} · `}
                                            Year {registration.year_level} · Block {registration.block}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            Registered {formatDateTime(registration.registered_at)}
                                        </p>
                                        <ProofStatusBadge
                                            status={registration.proof_status}
                                            hasPhoto={Boolean(registration.proof_url)}
                                            className="mt-2"
                                        />
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className="sr-only">Attendance:</span>
                                            <AttendanceStatusBadge status={registration.attendance_status} />
                                            {canModifyAttendance && (
                                                <ChangeAttendanceButton registration={registration} onOpen={setChanging} />
                                            )}
                                        </div>
                                        <p className="mt-1 text-xs text-slate-500">{attendanceNote(registration)}</p>
                                    </div>
                                    {registration.proof_url && (
                                        <button
                                            type="button"
                                            onClick={() => setReviewingId(registration.registration_id)}
                                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                                registration.awaiting_review
                                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                    : 'text-blue-700 ring-1 ring-blue-100 hover:bg-blue-50'
                                            }`}
                                        >
                                            <Eye size={14} />
                                            {registration.awaiting_review && canReviewProof ? 'Review' : 'View'}
                                        </button>
                                    )}
                                </li>
                            ))}
                        </ul>

                        <div className="hidden overflow-x-auto md:block">
                            <table className="w-full min-w-[880px] text-left text-sm">
                                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                    <tr>
                                        <th scope="col" className="px-5 py-3">Student</th>
                                        <th scope="col" className="px-5 py-3">Year and block</th>
                                        <th scope="col" className="px-5 py-3">Registered</th>
                                        <th scope="col" className="px-5 py-3">Proof photo</th>
                                        <th scope="col" className="px-5 py-3">Attendance</th>
                                        <th scope="col" className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((registration) => (
                                        <tr key={registration.registration_id} className="hover:bg-slate-50/60">
                                            <td className="px-5 py-3.5">
                                                <p className="font-semibold text-slate-900">{registration.student.name}</p>
                                                {registration.student.student_number && (
                                                    <p className="text-xs text-slate-500">{registration.student.student_number}</p>
                                                )}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">
                                                Year {registration.year_level} · Block {registration.block}
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">{formatDateTime(registration.registered_at)}</td>
                                            <td className="px-5 py-3.5">
                                                <ProofStatusBadge
                                                    status={registration.proof_status}
                                                    hasPhoto={Boolean(registration.proof_url)}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <AttendanceStatusBadge status={registration.attendance_status} />
                                                <p className="mt-1 text-xs text-slate-500">{attendanceNote(registration)}</p>
                                            </td>
                                            <td className="space-x-2 px-5 py-3.5 text-right whitespace-nowrap">
                                                {canModifyAttendance && (
                                                    <ChangeAttendanceButton registration={registration} onOpen={setChanging} />
                                                )}
                                                {registration.proof_url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReviewingId(registration.registration_id)}
                                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                                                            registration.awaiting_review
                                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                                : 'text-blue-700 hover:bg-blue-50'
                                                        }`}
                                                    >
                                                        <Eye size={14} />
                                                        {registration.awaiting_review && canReviewProof ? 'Review photo' : 'View photo'}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        </>
                    )}

                    {registrations?.last_page > 1 && (
                        <nav aria-label="Participant pages" className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:px-5">
                            <p className="text-slate-500">
                                {registrations.from}–{registrations.to} of {registrations.total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    aria-label="Previous page"
                                    disabled={!registrations.prev_page_url}
                                    onClick={() => router.get(registrations.prev_page_url, {}, { preserveState: true, preserveScroll: true })}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={!registrations.next_page_url}
                                    onClick={() => router.get(registrations.next_page_url, {}, { preserveState: true, preserveScroll: true })}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    Next
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </nav>
                    )}
                </div>
            </div>

            <Toast notification={notification} onClose={() => setNotification(null)} />

            <GlassConfirmDialog
                open={Boolean(changing)}
                icon={UserCheck}
                tone="primary"
                title={`Attendance of ${changing?.student.name ?? ''}`}
                processing={attendanceProcessing}
                onCancel={() => setChanging(null)}
                actions={
                    <div className="mt-6 flex flex-col gap-2">
                        {attendanceChoices.map((choice) => (
                            <button
                                key={choice}
                                type="button"
                                onClick={() => saveAttendance(choice)}
                                disabled={attendanceProcessing}
                                className={glassButtonClass}
                            >
                                Mark as {attendanceLabels[choice].toLowerCase()}
                            </button>
                        ))}
                        {changing?.attendance_version && (
                            <button
                                type="button"
                                onClick={() => saveAttendance('RESET')}
                                disabled={attendanceProcessing}
                                className={glassButtonClass}
                            >
                                <RotateCcw size={16} aria-hidden="true" />
                                Reset to automatic
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setChanging(null)}
                            disabled={attendanceProcessing}
                            className={`${glassButtonClass} mt-2`}
                        >
                            Cancel
                        </button>
                    </div>
                }
            >
                <p>
                    Currently <strong>{attendanceLabels[changing?.attendance_status] ?? ''}</strong>
                    {changing?.attendance_version ? ' (set by hand).' : ' (automatic, from the QR check-in and proof photo).'} A
                    manual choice replaces the automatic status until it is reset; a reset removes the record of who made
                    the change.
                </p>
            </GlassConfirmDialog>

            <GlassConfirmDialog
                open={reportStep === 'confirm'}
                icon={FileText}
                tone="primary"
                title="Generate report?"
                confirmLabel="Generate"
                onConfirm={() => setReportStep('preview')}
                onCancel={() => setReportStep(null)}
            >
                <p>Want to generate an Event Participation Report for {event.title}?</p>
            </GlassConfirmDialog>

            {reportStep === 'preview' && (
                <ReportModal event={event} routePrefix={routePrefix} onClose={() => setReportStep(null)} />
            )}

            {reviewing && (
                <ReviewModal
                    key={`${reviewing.registration_id}-${reviewing.proof_version}`}
                    registration={reviewing}
                    reviewUrl={route(`${routePrefix}.events.participants.proof.review`, [
                        event.event_id,
                        reviewing.registration_id,
                    ])}
                    canReview={canReviewProof}
                    onClose={() => setReviewingId(null)}
                />
            )}
        </Layout>
    );
}
