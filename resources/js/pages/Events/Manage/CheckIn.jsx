import EventStatusBadge from '@/components/events/EventStatusBadge';
import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import StudentDashboardLayout from '@/layouts/StudentDashboardLayout';
import { formatEventDate, formatTime, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, Link, usePoll } from '@inertiajs/react';
import { ArrowLeft, QrCode } from 'lucide-react';

function FacultyEventsLayout({ children }) {
    return <StudentDashboardLayout active="Events">{children}</StudentDashboardLayout>;
}

/**
 * QR check-in screen (SSD3-C) for the event's managers to show on a
 * projector or phone. The code rotates on the server every 15 seconds
 * (AttendanceService::CODE_PERIOD); polling every 5 keeps it current. The
 * latest names allow a quick roll call, so a forwarded code is noticed.
 */
export default function CheckIn({
    event,
    lifecycleStatus,
    checkInOpen,
    qrSvg,
    checkedInCount,
    recentCheckIns,
    routePrefix,
}) {
    const Layout = routePrefix === 'admin' ? AdminConnectLayout : FacultyEventsLayout;

    usePoll(5000, { only: ['lifecycleStatus', 'checkInOpen', 'qrSvg', 'checkedInCount', 'recentCheckIns'] });

    return (
        <Layout>
            <Head title={`Check-in · ${event.title}`} />

            <div className="mx-auto max-w-5xl pt-5 sm:pt-7">
                <Link
                    href={route(`${routePrefix}.events.participants.index`, event.event_id)}
                    className="inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                >
                    <ArrowLeft size={16} aria-hidden="true" />
                    Participants
                </Link>

                <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
                    <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)] sm:p-10">
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">QR check-in</p>
                        <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{event.title}</h1>
                        <p className="mt-2 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-500">
                            <EventStatusBadge status={lifecycleStatus} />
                            {formatEventDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)} ·{' '}
                            {locationLabel(event.location)}
                        </p>

                        {checkInOpen ? (
                            <>
                                <div
                                    role="img"
                                    aria-label="Check-in QR code. Registered students scan it with their phone camera."
                                    className="mx-auto mt-8 w-full max-w-[20rem] [&>svg]:h-auto [&>svg]:w-full"
                                    dangerouslySetInnerHTML={{ __html: qrSvg }}
                                />
                                <p className="mt-6 text-sm text-slate-600">
                                    Registered students scan this code with their phone camera. It changes every 15 seconds.
                                </p>
                            </>
                        ) : (
                            <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3 rounded-2xl bg-slate-50 p-8 text-slate-600">
                                <QrCode size={40} className="text-slate-400" aria-hidden="true" />
                                <p className="text-sm">The check-in code is shown only while the event is ongoing.</p>
                            </div>
                        )}

                        <p className="mt-6 text-lg font-bold text-slate-900" aria-live="polite">
                            {checkedInCount}
                            <span className="text-sm font-medium text-slate-400"> / {event.registered_count} checked in</span>
                        </p>
                    </div>

                    <section
                        aria-labelledby="recent-check-ins"
                        className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)]"
                    >
                        <h2 id="recent-check-ins" className="text-sm font-bold text-slate-900">
                            Latest check-ins
                        </h2>
                        {recentCheckIns.length === 0 ? (
                            <p className="mt-3 text-sm text-slate-500">No one has checked in yet.</p>
                        ) : (
                            <ol className="mt-3 divide-y divide-slate-100">
                                {recentCheckIns.map((checkIn) => (
                                    <li key={checkIn.registration_id} className="flex items-baseline justify-between gap-3 py-2">
                                        <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{checkIn.name}</span>
                                        <span className="shrink-0 text-xs text-slate-500">{formatTime(checkIn.checked_in_at)}</span>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </section>
                </div>
            </div>
        </Layout>
    );
}
