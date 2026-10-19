import ConfirmDialog from '@/components/events/ConfirmDialog';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import EventPageShell from '@/components/events/EventPageShell';
import StudentProofPanel from '@/components/events/StudentProofPanel';
import Toast from '@/components/ui/Toast';
import {
    formatDateTime,
    formatEventDate,
    formatTimeRange,
    lifecycleDescriptions,
    locationLabel,
} from '@/lib/eventDisplay';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    CalendarDays,
    Camera,
    CheckCircle2,
    Clock,
    MapPin,
    Timer,
    UserPlus,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';

function Fact({ icon: Icon, label, children }) {
    return (
        <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <Icon size={18} />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{children}</p>
            </div>
        </div>
    );
}

const unavailable = {
    full: 'This event is full.',
    closed: 'Registration for this event has closed.',
    not_student: 'Event registration is for students.',
};

/**
 * Registration (User Workflow): "Already registered or reached maximum
 * participants → Register button unclickable", otherwise a confirmation
 * modal showing the year and block recorded with the registration.
 */
function RegistrationPanel({ event, state, registration }) {
    const page = usePage();
    const user = page.props.auth?.user;
    const [confirming, setConfirming] = useState(false);
    const [processing, setProcessing] = useState(false);

    const register = () => {
        if (processing) return;

        router.post(
            route('student.registrations.store', event.event_id),
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setConfirming(false);
                },
            },
        );
    };

    return (
        <section aria-labelledby="registration-heading" className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <h2 id="registration-heading" className="text-sm font-bold text-slate-900">
                Registration
            </h2>

            <p className="mt-1 text-xs text-slate-500">
                {event.registered_count} of {event.max_participants} slots taken
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500"
                    style={{ width: `${Math.min(100, (event.registered_count / event.max_participants) * 100)}%` }}
                />
            </div>

            <div className="mt-4">
                {state === 'registered' && registration && (
                    <div className="space-y-4">
                        <p className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                            <CheckCircle2 size={18} />
                            You are registered
                        </p>
                        <p className="text-xs text-slate-500">
                            Registered {formatDateTime(registration.registered_at)} · Year {registration.year_level}, Block{' '}
                            {registration.block}
                        </p>
                        {event.proof_photo_required && (
                            <div className="border-t border-slate-100 pt-4">
                                <h3 className="mb-2 text-sm font-bold text-slate-900">Proof photo</h3>
                                <StudentProofPanel event={event} registration={registration} />
                            </div>
                        )}
                    </div>
                )}

                {state === 'available' && (
                    <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <UserPlus size={18} />
                        Register
                    </button>
                )}

                {state === 'guest' && (
                    <Link
                        href={route('login')}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        Log in as a student to register
                    </Link>
                )}

                {unavailable[state] && (
                    <button
                        type="button"
                        disabled
                        className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-500"
                    >
                        {unavailable[state]}
                    </button>
                )}
            </div>

            <ConfirmDialog
                open={confirming}
                icon={UserPlus}
                title="Confirm registration"
                confirmLabel="Confirm registration"
                processingLabel="Registering..."
                processing={processing}
                onCancel={() => setConfirming(false)}
                onConfirm={register}
            >
                <p>
                    Register for <strong>{event.title}</strong>? Registrations cannot be cancelled.
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
                    <div>
                        <dt className="text-xs font-semibold text-slate-500">Year level</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{user?.year_level || 'Not set'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs font-semibold text-slate-500">Block</dt>
                        <dd className="mt-0.5 font-semibold text-slate-900">{user?.block_number || 'Not set'}</dd>
                    </div>
                </dl>
                <p className="mt-2 text-xs text-slate-500">
                    Taken from your CCS account. If they are wrong, ask the CCS administrator to update
                    your account before registering.
                </p>
            </ConfirmDialog>
        </section>
    );
}

// User Workflow "DISPLAY: Event Details" with registration and proof.
export default function Show({ event, registrationState, registration }) {
    const page = usePage();
    const success = page.props.flash?.success;
    const registrationError = page.props.errors?.registration;
    const [notification, setNotification] = useState(null);

    // Registration and proof-upload results appear in the lower-right corner.
    useEffect(() => {
        if (success) setNotification({ type: 'success', message: success });
    }, [success]);

    useEffect(() => {
        if (registrationError) setNotification({ type: 'error', message: registrationError });
    }, [registrationError]);

    return (
        <EventPageShell>
            <Head title={event.title} />

            <Link
                href={route('events.index')}
                className="mt-2 inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
            >
                <ArrowLeft size={16} />
                All events
            </Link>

            <article className="mt-4 overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
                <img
                    src={event.poster_url}
                    alt={`Poster for ${event.title}`}
                    className="max-h-[28rem] w-full bg-slate-100 object-cover"
                />

                <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                    <div>
                        <EventStatusBadge status={event.lifecycle_status} />
                        <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{event.title}</h1>
                        <p className="mt-1 text-xs text-slate-500">
                            {lifecycleDescriptions[event.lifecycle_status]}
                        </p>

                        <h2 className="mt-6 text-sm font-bold text-slate-900">About this event</h2>
                        <p className="mt-1 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {event.description}
                        </p>

                        <h2 className="mt-6 text-sm font-bold text-slate-900">Who can join</h2>
                        <p className="mt-1 whitespace-pre-line text-sm leading-7 text-slate-600">
                            {event.target_participants}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <RegistrationPanel event={event} state={registrationState} registration={registration} />

                        <aside className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                            <Fact icon={CalendarDays} label="Date">
                                {formatEventDate(event.event_date, { weekday: 'long' })}
                            </Fact>
                            <Fact icon={Clock} label="Time">
                                {formatTimeRange(event.start_time, event.end_time)}
                            </Fact>
                            <Fact icon={MapPin} label="Location">
                                {locationLabel(event.location)}
                            </Fact>
                            <Fact icon={Users} label="Max participants">
                                {event.max_participants}
                            </Fact>
                            <Fact icon={Timer} label="Registration deadline">
                                {formatDateTime(event.registration_deadline)}
                            </Fact>
                            <Fact icon={Camera} label="Proof photo">
                                {event.proof_photo_required
                                    ? `Required · upload from ${formatDateTime(event.proof_upload_start_at)} to ${formatDateTime(event.proof_upload_end_at)}`
                                    : 'Not required'}
                            </Fact>
                        </aside>
                    </div>
                </div>
            </article>
            <Toast notification={notification} onClose={() => setNotification(null)} />
        </EventPageShell>
    );
}
