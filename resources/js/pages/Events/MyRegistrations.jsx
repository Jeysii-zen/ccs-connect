import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import AttendanceStatusBadge from '@/components/events/AttendanceStatusBadge';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import EventPageShell from '@/components/events/EventPageShell';
import StudentProofPanel from '@/components/events/StudentProofPanel';
import { formatDateTime, formatEventDate, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, Link, usePage } from '@inertiajs/react';
import { CalendarCheck2, CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

// The signed-in student's registrations and their proof status.
export default function MyRegistrations({ registrations }) {
    const items = registrations?.data ?? [];
    const success = usePage().props.flash?.success;
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (success) setNotification({ type: 'success', message: success });
    }, [success]);

    return (
        <EventPageShell tabs>
            <Head title="My Events" />

            <div className="pt-4 sm:pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Student</p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">My events</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Events you registered for, and the proof photos they need.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white">
                    <EmptyState
                        icon={CalendarCheck2}
                        title="You have not registered for any events yet"
                        description="Browse upcoming CCS events and register for the ones you want to join."
                    />
                    <div className="pb-8 text-center">
                        <Link
                            href={route('events.index')}
                            className="inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Browse events
                        </Link>
                    </div>
                </div>
            ) : (
                <ul className="mt-8 space-y-4">
                    {items.map(({ event, registration }) => (
                        <li
                            key={registration.registration_id}
                            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm"
                        >
                            <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
                                <div className="flex gap-4">
                                    <img loading="lazy" decoding="async"
                                        src={event.poster_url}
                                        alt=""
                                        className="h-20 w-20 shrink-0 rounded-2xl bg-slate-100 object-cover ring-1 ring-slate-200"
                                    />
                                    <div className="min-w-0">
                                        <EventStatusBadge status={event.lifecycle_status} />
                                        <Link
                                            href={route('events.show', event.event_id)}
                                            className="mt-2 block text-lg font-bold leading-snug text-slate-900 hover:text-blue-700"
                                        >
                                            {event.title}
                                        </Link>
                                        <div className="mt-2 space-y-1 text-sm text-slate-600">
                                            <p className="flex items-center gap-2">
                                                <CalendarDays size={14} className="text-blue-600" />
                                                {formatEventDate(event.event_date)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <Clock size={14} className="text-blue-600" />
                                                {formatTimeRange(event.start_time, event.end_time)}
                                            </p>
                                            <p className="flex items-center gap-2">
                                                <MapPin size={14} className="text-blue-600" />
                                                <span className="truncate">{locationLabel(event.location)}</span>
                                            </p>
                                        </div>
                                        <p className="mt-2 text-xs text-slate-500">
                                            Registered {formatDateTime(registration.registered_at)}
                                        </p>
                                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                            <AttendanceStatusBadge status={registration.attendance_status} />
                                            {registration.checked_in_at
                                                ? `Checked in ${formatDateTime(registration.checked_in_at)}`
                                                : 'Scan the QR code shown at the event to check in.'}
                                        </p>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                                    <h2 className="mb-2 text-sm font-bold text-slate-900">Proof photo</h2>
                                    <StudentProofPanel event={event} registration={registration} />
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {registrations?.last_page > 1 && (
                <nav aria-label="Registration pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
                    {registrations.prev_page_url && (
                        <Link
                            href={registrations.prev_page_url}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </Link>
                    )}
                    <span className="text-slate-500">
                        Page {registrations.current_page} of {registrations.last_page}
                    </span>
                    {registrations.next_page_url && (
                        <Link
                            href={registrations.next_page_url}
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Next
                            <ChevronRight size={16} />
                        </Link>
                    )}
                </nav>
            )}
            <Toast notification={notification} onClose={() => setNotification(null)} />
        </EventPageShell>
    );
}
