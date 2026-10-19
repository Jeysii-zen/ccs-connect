import EventStatusBadge from '@/components/events/EventStatusBadge';
import FormModal, { ModalBody, ModalFooter } from '@/components/ui/FormModal';
import { ghostButtonClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/formStyles';
import {
    formatDateTime,
    formatEventDate,
    formatTimeRange,
    lifecycleDescriptions,
    locationLabel,
} from '@/lib/eventDisplay';
import {
    Archive,
    CalendarDays,
    Camera,
    Clock,
    MapPin,
    Pencil,
    Send,
    Trash2,
    UserRound,
    Users,
    X,
} from 'lucide-react';

function Detail({ icon: Icon, label, children }) {
    return (
        <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-blue-100">
                <Icon size={17} />
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {label}
                </p>
                <div className="mt-0.5 text-sm font-medium text-slate-800">{children}</div>
            </div>
        </div>
    );
}

/**
 * Read-only event view (Faculty/Admin workflow: "Select an event → Display
 * the Event Modal"). Pass action handlers to show management buttons; the
 * buttons follow the server's allowed actions for the event's state.
 */
export default function EventDetailsModal({ event, onClose, onEdit, onPublish, onArchive, onDelete, onParticipants }) {
    if (!event) return null;

    const actions = event.actions ?? {};

    return (
        <FormModal size="2xl" labelledBy="event-details-title" onClose={onClose}>
                <div className="relative mt-2 shrink-0 sm:mt-0">
                    <img
                        src={event.poster_url}
                        alt={`Poster for ${event.title}`}
                        className="h-40 w-full bg-slate-100 object-cover sm:h-64"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#020618]/70 via-[#020618]/10 to-transparent" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
                        aria-label="Close event details"
                    >
                        <X size={18} />
                    </button>
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                        <EventStatusBadge status={event.lifecycle_status} className="bg-white/95" />
                        <h2
                            id="event-details-title"
                            className="mt-2 break-words text-xl font-bold leading-tight text-white sm:text-3xl"
                        >
                            {event.title}
                        </h2>
                    </div>
                </div>

                <ModalBody>
                    <p className="text-xs font-medium text-slate-500">
                        {lifecycleDescriptions[event.lifecycle_status]}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <Detail icon={CalendarDays} label="Date">
                            {formatEventDate(event.event_date, { weekday: 'long' })}
                        </Detail>
                        <Detail icon={Clock} label="Time">
                            {formatTimeRange(event.start_time, event.end_time)}
                        </Detail>
                        <Detail icon={MapPin} label="Location">
                            {locationLabel(event.location)}
                        </Detail>
                        <Detail icon={Users} label="Participants">
                            {event.registered_count ?? 0} of {event.max_participants} registered · registration closes{' '}
                            {formatDateTime(event.registration_deadline)}
                        </Detail>
                        <Detail icon={Camera} label="Proof photo">
                            {event.proof_photo_required
                                ? `Required · uploads ${formatDateTime(event.proof_upload_start_at)} to ${formatDateTime(event.proof_upload_end_at)}`
                                : 'Not required'}
                        </Detail>
                        {event.creator && (
                            <Detail icon={UserRound} label="Created by">
                                {event.creator.name || 'CCS Connect'}
                            </Detail>
                        )}
                    </div>

                    <section className="mt-5">
                        <h3 className="text-sm font-bold text-slate-900">Target participants</h3>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {event.target_participants}
                        </p>
                    </section>

                    <section className="mt-5">
                        <h3 className="text-sm font-bold text-slate-900">Description</h3>
                        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">
                            {event.description}
                        </p>
                    </section>
                </ModalBody>

                {(onEdit || onDelete) && (
                    <ModalFooter className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {actions.delete && onDelete ? (
                            <button
                                type="button"
                                onClick={() => onDelete(event)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 sm:py-2.5"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        ) : (
                            <span />
                        )}

                        <div className="grid grid-cols-2 gap-2 sm:flex">
                            {onParticipants && (
                                <button
                                    type="button"
                                    onClick={() => onParticipants(event)}
                                    className={ghostButtonClass}
                                >
                                    <Users size={16} />
                                    Participants
                                </button>
                            )}
                            {actions.archive && onArchive && (
                                <button
                                    type="button"
                                    onClick={() => onArchive(event)}
                                    className={ghostButtonClass}
                                >
                                    <Archive size={16} />
                                    Archive
                                </button>
                            )}
                            {actions.edit && onEdit && (
                                <button
                                    type="button"
                                    onClick={() => onEdit(event)}
                                    className={secondaryButtonClass}
                                >
                                    <Pencil size={16} />
                                    Edit
                                </button>
                            )}
                            {actions.publish && onPublish && (
                                <button
                                    type="button"
                                    onClick={() => onPublish(event)}
                                    className={primaryButtonClass}
                                >
                                    <Send size={16} />
                                    Publish
                                </button>
                            )}
                        </div>
                    </ModalFooter>
                )}
        </FormModal>
    );
}
