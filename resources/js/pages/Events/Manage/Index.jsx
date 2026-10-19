import EmptyState from '@/components/ui/EmptyState';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/events/ConfirmDialog';
import EventDetailsModal from '@/components/events/EventDetailsModal';
import EventFormModal from '@/components/events/EventFormModal';
import EventStatusBadge from '@/components/events/EventStatusBadge';
import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import StudentDashboardLayout from '@/layouts/StudentDashboardLayout';
import { formatEventDate, formatTimeRange, locationLabel } from '@/lib/eventDisplay';
import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    Archive,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Eye,
    MapPin,
    Pencil,
    Plus,
    Search,
    Send,
    Trash2,
    Users,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const views = [
    { key: 'all', label: 'All events' },
    { key: 'drafts', label: 'Drafts' },
    { key: 'published', label: 'Published' },
    { key: 'archived', label: 'Archived' },
];

const confirmations = {
    publish: {
        icon: Send,
        title: 'Publish event?',
        confirmLabel: 'Publish event',
        processingLabel: 'Publishing...',
        tone: 'primary',
        message: (event) => (
            <>
                <strong>{event.title}</strong> will become visible to students and guests.
            </>
        ),
    },
    archive: {
        icon: Archive,
        title: 'Archive event?',
        confirmLabel: 'Archive event',
        processingLabel: 'Archiving...',
        tone: 'primary',
        message: (event) => (
            <>
                <strong>{event.title}</strong> will be hidden from public lists and can no
                longer be edited. Its records, including registrations, are kept.
            </>
        ),
    },
    delete: {
        icon: Trash2,
        title: 'Delete event?',
        confirmLabel: 'Delete event',
        processingLabel: 'Deleting...',
        tone: 'danger',
        message: (event) => (
            <>
                You are about to permanently delete <strong>{event.title}</strong>. Its poster
                and any registrations are removed too. This cannot be undone; archive the
                event instead to keep its history.
            </>
        ),
    },
};


function IconButton({ icon: Icon, label, onClick, tone = 'default' }) {
    const tones = {
        default: 'text-slate-500 hover:bg-slate-100 hover:text-slate-800',
        blue: 'text-blue-600 hover:bg-blue-50',
        red: 'text-red-600 hover:bg-red-50',
    };

    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`rounded-lg p-2 transition ${tones[tone]}`}
        >
            <Icon size={16} />
        </button>
    );
}

function RowActions({ event, onView, onEdit, onConfirm, onParticipants }) {
    const actions = event.actions ?? {};

    return (
        <div className="flex items-center justify-end gap-0.5">
            <IconButton icon={Eye} label={`View ${event.title}`} onClick={() => onView(event)} />
            <IconButton icon={Users} label={`Participants of ${event.title}`} tone="blue" onClick={() => onParticipants(event)} />
            {actions.edit && (
                <IconButton icon={Pencil} label={`Edit ${event.title}`} tone="blue" onClick={() => onEdit(event)} />
            )}
            {actions.publish && (
                <IconButton icon={Send} label={`Publish ${event.title}`} tone="blue" onClick={() => onConfirm('publish', event)} />
            )}
            {actions.archive && (
                <IconButton icon={Archive} label={`Archive ${event.title}`} onClick={() => onConfirm('archive', event)} />
            )}
            {actions.delete && (
                <IconButton icon={Trash2} label={`Delete ${event.title}`} tone="red" onClick={() => onConfirm('delete', event)} />
            )}
        </div>
    );
}

// Faculty manage events inside their dashboard frame (sidebar and top bar),
// with Events highlighted; the dashboard's own content is not included.
function FacultyEventsLayout({ children }) {
    return <StudentDashboardLayout active="Events">{children}</StudentDashboardLayout>;
}

export default function Index() {
    const page = usePage();
    const {
        events,
        currentView = 'all',
        filters = {},
        eventCounts = {},
        locations = [],
        routePrefix,
    } = page.props;

    const Layout = routePrefix === 'admin' ? AdminConnectLayout : FacultyEventsLayout;
    const indexRoute = `${routePrefix}.events.index`;

    const [search, setSearch] = useState(filters.q ?? '');
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [confirming, setConfirming] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [notification, setNotification] = useState(null);
    const searchTimer = useRef(null);
    // The tab last asked for: a search typed while a tab change is still
    // loading must keep that tab, not the one currently on screen.
    const requestedView = useRef(currentView);

    useEffect(() => {
        requestedView.current = currentView;
    }, [currentView]);

    const items = events?.data ?? [];

    useEffect(() => {
        const success = page.props.flash?.success;

        if (success) setNotification({ type: 'success', message: success });
    }, [page.props.flash?.success]);


    // Opened from the sidebar's "Create Event" link.
    useEffect(() => {
        const params = new URLSearchParams(page.url.split('?')[1] ?? '');

        if (params.get('create') === '1') setCreating(true);
    }, [page.url]);

    // Keep an open details view in sync with refreshed list data.
    useEffect(() => {
        if (!viewing) return;

        setViewing(items.find((item) => item.event_id === viewing.event_id) ?? null);
    }, [events]);

    const visit = (params) => {
        router.get(route(indexRoute), params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const changeView = (view) => {
        requestedView.current = view;
        visit({ view, ...(search ? { q: search } : {}) });
    };

    const onSearch = (value) => {
        setSearch(value);
        window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(
            () => visit({ view: requestedView.current, ...(value.trim() ? { q: value.trim() } : {}) }),
            400,
        );
    };

    useEffect(() => () => window.clearTimeout(searchTimer.current), []);

    const closeForm = () => {
        setCreating(false);
        setEditing(null);

        if (new URLSearchParams(window.location.search).get('create') === '1') {
            visit({ view: currentView });
        }
    };

    const openEdit = (event) => {
        setViewing(null);
        setEditing(event);
    };

    const openConfirm = (type, event) => setConfirming({ type, event });

    const openParticipants = (event) =>
        router.get(route(`${routePrefix}.events.participants.index`, event.event_id));

    // Capacity with live registrations, plus photos waiting for review.
    const capacity = (event) => (
        <>
            <span className="font-medium text-slate-800">{event.registered_count}</span>
            <span className="text-slate-400"> / {event.max_participants}</span>
            {event.pending_review_count > 0 && (
                <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
                    {event.pending_review_count} to review
                </span>
            )}
        </>
    );

    const runConfirmed = () => {
        if (!confirming || processing) return;

        const { type, event } = confirming;
        const options = {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => {
                setConfirming(null);
                if (type === 'delete') setViewing(null);
            },
            onError: (errors) => {
                setConfirming(null);
                setNotification({
                    type: 'error',
                    message: errors.event ?? 'The action could not be completed. Please try again.',
                });
            },
        };

        if (type === 'delete') {
            router.delete(route(`${routePrefix}.events.destroy`, event.event_id), options);
        } else {
            router.patch(route(`${routePrefix}.events.${type}`, event.event_id), {}, options);
        }
    };

    const confirmation = confirming ? confirmations[confirming.type] : null;
    const noLocations = locations.length === 0;

    return (
        <Layout>
            <Head title="Events" />

            <div className="mx-auto max-w-7xl pt-5 sm:pt-7">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                            CCS Connect · {routePrefix === 'admin' ? 'Administration' : 'Faculty'}
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            Events
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            {routePrefix === 'admin'
                                ? 'Create, publish, and manage every CCS event.'
                                : 'Create, publish, and manage the events you organize.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setEditing(null);
                            setCreating(true);
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Create event
                    </button>
                </div>


                {noLocations && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        <AlertCircle size={18} className="mt-0.5 shrink-0" />
                        <p>
                            No campus locations are configured yet. Events need one of the predefined
                            CCS locations, so new events cannot be saved until they are set up.
                        </p>
                    </div>
                )}

                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)]">
                    <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div role="tablist" aria-label="Event status" className="flex gap-1 overflow-x-auto">
                            {views.map(({ key, label }) => {
                                const active = currentView === key;

                                return (
                                    <button
                                        key={key}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => changeView(key)}
                                        className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                                            active
                                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                                        }`}
                                    >
                                        {label}
                                        <span
                                            className={`rounded-full px-1.5 text-[11px] ${
                                                active ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                            }`}
                                        >
                                            {eventCounts[key] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="relative">
                            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={search}
                                onChange={(event) => onSearch(event.target.value)}
                                placeholder="Search by title..."
                                aria-label="Search events by title"
                                maxLength={100}
                                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 lg:w-64"
                            />
                        </div>
                    </div>

                    {items.length === 0 ? (
                        <EmptyState
                            icon={CalendarDays}
                            title={filters.q ? 'No events match your search' : 'No events here yet'}
                            description={
                                filters.q
                                    ? 'Try a different title or clear the search.'
                                    : 'Create an event to start sharing CCS activities.'
                            }
                        />
                    ) : (
                        <>
                            {/* Desktop table */}
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[760px] text-left text-sm">
                                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-500">
                                        <tr>
                                            <th scope="col" className="px-5 py-3">Event</th>
                                            <th scope="col" className="px-5 py-3">Date and time</th>
                                            <th scope="col" className="px-5 py-3">Location</th>
                                            <th scope="col" className="px-5 py-3">Capacity</th>
                                            <th scope="col" className="px-5 py-3">Status</th>
                                            <th scope="col" className="px-5 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {items.map((event) => (
                                            <tr key={event.event_id} className="transition hover:bg-slate-50/60">
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewing(event)}
                                                        className="flex min-w-0 items-center gap-3 text-left"
                                                    >
                                                        <img loading="lazy" decoding="async"
                                                            src={event.poster_url}
                                                            alt=""
                                                            className="h-11 w-11 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200"
                                                        />
                                                        <span className="min-w-0">
                                                            <span className="block max-w-[16rem] truncate font-semibold text-slate-900 hover:text-blue-700">
                                                                {event.title}
                                                            </span>
                                                            {routePrefix === 'admin' && (
                                                                <span className="block truncate text-xs text-slate-500">
                                                                    by {event.creator?.name || 'CCS Connect'}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-5 py-3.5 text-slate-600">
                                                    <span className="block font-medium text-slate-800">
                                                        {formatEventDate(event.event_date)}
                                                    </span>
                                                    <span className="text-xs">
                                                        {formatTimeRange(event.start_time, event.end_time)}
                                                    </span>
                                                </td>
                                                <td className="max-w-[14rem] truncate px-5 py-3.5 text-slate-600">
                                                    {locationLabel(event.location)}
                                                </td>
                                                <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                                                    {capacity(event)}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <EventStatusBadge status={event.lifecycle_status} />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <RowActions
                                                        event={event}
                                                        onView={setViewing}
                                                        onEdit={openEdit}
                                                        onConfirm={openConfirm}
                                                        onParticipants={openParticipants}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile cards */}
                            <ul className="divide-y divide-slate-100 md:hidden">
                                {items.map((event) => (
                                    <li key={event.event_id} className="p-4">
                                        <button
                                            type="button"
                                            onClick={() => setViewing(event)}
                                            className="flex w-full gap-3 text-left"
                                        >
                                            <img loading="lazy" decoding="async"
                                                src={event.poster_url}
                                                alt=""
                                                className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover ring-1 ring-slate-200"
                                            />
                                            <span className="min-w-0 flex-1">
                                                <EventStatusBadge status={event.lifecycle_status} />
                                                <span className="mt-1.5 block font-semibold text-slate-900">
                                                    {event.title}
                                                </span>
                                                <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                                    <CalendarDays size={13} />
                                                    {formatEventDate(event.event_date)} ·{' '}
                                                    {formatTimeRange(event.start_time, event.end_time)}
                                                </span>
                                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                                    <MapPin size={13} />
                                                    <span className="truncate">{locationLabel(event.location)}</span>
                                                </span>
                                                <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Users size={13} />
                                                    <span>{capacity(event)}</span>
                                                </span>
                                            </span>
                                        </button>
                                        <div className="mt-2">
                                            <RowActions
                                                event={event}
                                                onView={setViewing}
                                                onEdit={openEdit}
                                                onConfirm={openConfirm}
                                                onParticipants={openParticipants}
                                            />
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {events?.last_page > 1 && (
                        <nav
                            aria-label="Event pages"
                            className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm sm:px-5"
                        >
                            <p className="text-slate-500">
                                {events.from}–{events.to} of {events.total}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={!events.prev_page_url}
                                    onClick={() => router.get(events.prev_page_url, {}, { preserveState: true, preserveScroll: true })}
                                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                                >
                                    <ChevronLeft size={16} />
                                    Previous
                                </button>
                                <span className="text-slate-500">
                                    Page {events.current_page} of {events.last_page}
                                </span>
                                <button
                                    type="button"
                                    disabled={!events.next_page_url}
                                    onClick={() => router.get(events.next_page_url, {}, { preserveState: true, preserveScroll: true })}
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

            {(creating || editing) && (
                <EventFormModal
                    key={editing?.event_id ?? 'new'}
                    event={editing}
                    locations={locations}
                    routePrefix={routePrefix}
                    onClose={closeForm}
                    onSaved={() => {
                        setCreating(false);
                        setEditing(null);
                    }}
                />
            )}

            <EventDetailsModal
                event={viewing}
                onClose={() => setViewing(null)}
                onEdit={openEdit}
                onPublish={(event) => openConfirm('publish', event)}
                onArchive={(event) => openConfirm('archive', event)}
                onDelete={(event) => openConfirm('delete', event)}
                onParticipants={openParticipants}
            />

            <Toast notification={notification} onClose={() => setNotification(null)} />

            <ConfirmDialog
                open={Boolean(confirmation)}
                icon={confirmation?.icon}
                title={confirmation?.title}
                confirmLabel={confirmation?.confirmLabel}
                processingLabel={confirmation?.processingLabel}
                tone={confirmation?.tone}
                processing={processing}
                onCancel={() => setConfirming(null)}
                onConfirm={runConfirmed}
            >
                {confirming && confirmation?.message(confirming.event)}
            </ConfirmDialog>
        </Layout>
    );
}
