import EventPageShell from '@/components/events/EventPageShell';
import { primaryButtonClass, secondaryButtonClass } from '@/components/ui/formStyles';
import { formatDateTime, formatEventDate, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, Link, useForm } from '@inertiajs/react';
import { AlertCircle, CalendarCheck2, QrCode } from 'lucide-react';

// Where the event's QR code leads (SSD3-C): the student confirms the check-in.
export default function CheckIn({ event, code, registered, checkInOpen, checkedInAt }) {
    const { post, processing, errors } = useForm({ code });

    const submit = (formEvent) => {
        formEvent.preventDefault();
        post(route('student.check-in.store', event.event_id));
    };

    return (
        <EventPageShell>
            <Head title={`Check in · ${event.title}`} />

            <div className="mx-auto max-w-lg pt-6 sm:pt-10">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-6 text-center shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)] sm:p-8">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                        {checkedInAt ? <CalendarCheck2 size={28} aria-hidden="true" /> : <QrCode size={28} aria-hidden="true" />}
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Event check-in</p>
                    <h1 className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950">{event.title}</h1>
                    <p className="mt-2 text-sm text-slate-500">
                        {formatEventDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}
                        <br />
                        {locationLabel(event.location)}
                    </p>

                    {!registered ? (
                        <p className="mt-6 text-sm text-slate-600">
                            You are not registered for this event, so you cannot check in.
                        </p>
                    ) : checkedInAt ? (
                        <p className="mt-6 text-sm text-slate-600">You checked in on {formatDateTime(checkedInAt)}.</p>
                    ) : !checkInOpen ? (
                        <p className="mt-6 text-sm text-slate-600">
                            Check-in is closed. It is open only while the event is ongoing.
                        </p>
                    ) : (
                        <form onSubmit={submit} className="mt-6">
                            {errors.attendance && (
                                <p role="alert" className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-red-600">
                                    <AlertCircle size={16} className="shrink-0" aria-hidden="true" />
                                    {errors.attendance}
                                </p>
                            )}
                            <button type="submit" disabled={processing} className={`${primaryButtonClass} w-full`}>
                                {processing ? 'Checking in...' : 'Check in now'}
                            </button>
                        </form>
                    )}

                    <Link
                        href={registered ? route('student.registrations.index') : route('events.show', event.event_id)}
                        className={`${secondaryButtonClass} mt-3 w-full`}
                    >
                        {registered ? 'My events' : 'View event'}
                    </Link>
                </div>
            </div>
        </EventPageShell>
    );
}
