import EmptyState from '@/components/ui/EmptyState';
import LoadingImage from '@/components/ui/LoadingImage';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import EventPageShell from '@/components/events/EventPageShell';
import { formatEventDate, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, Link } from '@inertiajs/react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react';

export default function Index({ events }) {
    const items = events?.data ?? [];

    return (
        <EventPageShell tabs>
            <Head title="Upcoming Events" />

            <div className="pt-4 sm:pt-6">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                    College of Computing Studies
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                    Upcoming events
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                    Seminars, competitions, and activities organized by CCS.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="mt-8 rounded-3xl border border-slate-200/80 bg-white">
                    <EmptyState
                        icon={CalendarDays}
                        title="No upcoming events yet"
                        description="Published CCS events will appear here."
                    />
                </div>
            ) : (
                <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((event) => (
                        <li key={event.event_id}>
                            <Link
                                href={route('events.show', event.event_id)}
                                className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-900/5"
                            >
                                <LoadingImage
                                    src={event.poster_url}
                                    alt={`Poster for ${event.title}`}
                                    className="h-44 w-full"
                                    label="Loading poster…"
                                />
                                <div className="flex flex-1 flex-col p-5">
                                    <EventStatusBadge status={event.lifecycle_status} className="self-start" />
                                    <h2 className="mt-3 text-lg font-bold leading-snug text-slate-900 group-hover:text-blue-700">
                                        {event.title}
                                    </h2>
                                    <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                                        <p className="flex items-center gap-2">
                                            <CalendarDays size={15} className="shrink-0 text-blue-600" />
                                            {formatEventDate(event.event_date, { weekday: 'short' })}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <Clock size={15} className="shrink-0 text-blue-600" />
                                            {formatTimeRange(event.start_time, event.end_time)}
                                        </p>
                                        <p className="flex items-center gap-2">
                                            <MapPin size={15} className="shrink-0 text-blue-600" />
                                            <span className="truncate">{locationLabel(event.location)}</span>
                                        </p>
                                    </div>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            {events?.last_page > 1 && (
                <nav aria-label="Event pages" className="mt-8 flex items-center justify-center gap-3 text-sm">
                    {events.prev_page_url ? (
                        <Link
                            href={events.prev_page_url}
                            preserveScroll
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            <ChevronLeft size={16} />
                            Previous
                        </Link>
                    ) : null}
                    <span className="text-slate-500">
                        Page {events.current_page} of {events.last_page}
                    </span>
                    {events.next_page_url ? (
                        <Link
                            href={events.next_page_url}
                            preserveScroll
                            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                            Next
                            <ChevronRight size={16} />
                        </Link>
                    ) : null}
                </nav>
            )}
        </EventPageShell>
    );
}
