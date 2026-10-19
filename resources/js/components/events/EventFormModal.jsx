import ConfirmDialog from '@/components/events/ConfirmDialog';
import DateTimeInput from '@/components/ui/DateTimeInput';
import FormModal, { ModalBody, ModalFooter, ModalHeader } from '@/components/ui/FormModal';
import ImageDropzone from '@/components/ui/ImageDropzone';
import { fieldClass, ghostButtonClass, labelClass, primaryButtonClass, secondaryButtonClass } from '@/components/ui/formStyles';
import { formatDateTime } from '@/lib/eventDisplay';
import { ccsNow, deadlineBounds, eventStart, validateSchedule } from '@/lib/eventSchedule';
import { describeSubmission } from '@/lib/uploadProgress';
import { useForm } from '@inertiajs/react';
import { AlertCircle, CalendarPlus, Camera, Pencil, Send } from 'lucide-react';
import { useState } from 'react';
import useObjectUrl from '@/lib/useObjectUrl';

const inputClass = fieldClass;

// Mirrors the server rules in EventFormRequest.
const POSTER_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_POSTER_BYTES = 15 * 1024 * 1024;

function FieldError({ id, message }) {
    if (!message) return null;

    return (
        <p id={id} className="mt-1.5 text-xs font-medium text-red-600">
            {message}
        </p>
    );
}

function Section({ title, description, children }) {
    return (
        <section className="rounded-3xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-5">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
            <div className="mt-4 space-y-4">{children}</div>
        </section>
    );
}

// The picker's min is inclusive; the server needs strictly after now.
const nextMinute = () => ccsNow(new Date(Date.now() + 60_000));

// Fields whose rules depend on other fields; re-checked when those change.
const dependents = {
    event_date: ['event_date', 'registration_deadline', 'proof_upload_start_at'],
    start_time: ['event_date', 'end_time', 'registration_deadline', 'proof_upload_start_at'],
    end_time: ['end_time'],
    registration_deadline: ['registration_deadline'],
    proof_upload_start_at: ['proof_upload_start_at', 'proof_upload_end_at'],
    proof_upload_end_at: ['proof_upload_end_at'],
};

export default function EventFormModal({ event, locations, routePrefix, onClose, onSaved }) {
    const editing = Boolean(event);

    const form = useForm({
        title: event?.title ?? '',
        description: event?.description ?? '',
        event_date: event?.event_date ?? '',
        start_time: event?.start_time ?? '',
        end_time: event?.end_time ?? '',
        location_id: event?.location_id ?? '',
        target_participants: event?.target_participants ?? '',
        max_participants: event?.max_participants ?? '',
        registration_deadline: event?.registration_deadline ?? '',
        proof_photo_required: event?.proof_photo_required ?? false,
        proof_upload_start_at: event?.proof_upload_start_at ?? '',
        proof_upload_end_at: event?.proof_upload_end_at ?? '',
        poster: null,
        ...(editing ? { _method: 'put' } : {}),
    });

    const [clientErrors, setClientErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [intent, setIntent] = useState('Draft');
    const posterPreview = useObjectUrl(form.data.poster);
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const errors = { ...form.errors, ...clientErrors };
    // Mirrors UpdateEventRequest: once students registered, capacity cannot
    // drop below them and the proof requirement is fixed.
    const registered = editing ? event.registered_count ?? 0 : 0;
    const noLocations = locations.length === 0;
    const hasChanges = form.isDirty || form.data.poster !== null;

    const requestClose = () => {
        if (form.processing) return;

        if (hasChanges) {
            setConfirmDiscard(true);
            return;
        }

        onClose();
    };

    const scheduleOptions = { editing, original: event };

    const setField = (name, value) => {
        form.setData(name, value);
        form.clearErrors(name);
        setSubmitError('');

        // Re-check this field and the ones that depend on it with the new
        // value, so e.g. moving the start time flags a deadline that is now
        // after it — but only fields that already have a value.
        const next = { ...form.data, [name]: value };
        const checks = validateSchedule(next, scheduleOptions);

        setClientErrors((current) => {
            const updated = { ...current };
            delete updated[name];

            for (const field of dependents[name] ?? []) {
                if (field !== name) form.clearErrors(field);

                if (checks[field] && next[field]) {
                    updated[field] = checks[field];
                } else {
                    delete updated[field];
                }
            }

            return updated;
        });
    };

    const onInput = (inputEvent) => setField(inputEvent.target.name, inputEvent.target.value);

    const choosePoster = (file) => {
        if (!file) return;

        if (!POSTER_TYPES.includes(file.type)) {
            setClientErrors((current) => ({ ...current, poster: 'The poster must be a JPG, PNG or WEBP image.' }));
            return;
        }

        if (file.size > MAX_POSTER_BYTES) {
            setClientErrors((current) => ({ ...current, poster: 'The poster must not be larger than 15 MB.' }));
            return;
        }

        setField('poster', file);
    };

    const submit = (status) => {
        if (form.processing) return;

        const localErrors = validateSchedule(form.data, scheduleOptions);

        if (registered > 0 && Number(form.data.max_participants) < registered) {
            localErrors.max_participants = `Max participants cannot be lower than the ${registered} students already registered.`;
        }
        setClientErrors(localErrors);

        if (Object.keys(localErrors).length > 0) {
            setSubmitError('Please fix the highlighted fields.');
            return;
        }

        setIntent(status);

        form.transform((data) => {
            const payload = { ...data };

            if (!payload.poster) delete payload.poster;
            if (!editing) payload.event_status = status;

            return payload;
        });

        const url = editing
            ? route(`${routePrefix}.events.update`, event.event_id)
            : route(`${routePrefix}.events.store`);

        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => onSaved(),
            onError: (serverErrors) => {
                setSubmitError(
                    serverErrors.event ?? 'Please fix the highlighted fields.',
                );
            },
            onNetworkError: () => {
                setSubmitError(
                    'The connection was interrupted, so the event may not have been saved. Check your connection and try again.',
                );

                return false;
            },
        });
    };

    const submission = describeSubmission(form.processing, form.progress);
    const field = (name) => ({
        id: `event-${name}`,
        name,
        value: form.data[name],
        onChange: onInput,
        disabled: form.processing,
        'aria-invalid': errors[name] ? true : undefined,
        'aria-describedby': errors[name] ? `event-${name}-error` : undefined,
    });

    const currentPoster = posterPreview ?? event?.poster_url ?? null;
    const startsAt = eventStart(form.data);
    const deadline = deadlineBounds(form.data, { original: event, now: nextMinute() });

    return (
        <>
            <FormModal
                as="form"
                size="2xl"
                labelledBy="event-form-title"
                busy={form.processing}
                onClose={requestClose}
                panelProps={{
                    noValidate: true,
                    onSubmit: (submitEvent) => {
                        submitEvent.preventDefault();
                        submit(editing ? null : 'Published');
                    },
                }}
            >
                <ModalHeader
                    icon={editing ? Pencil : CalendarPlus}
                    eyebrow="Event management"
                    title={editing ? 'Edit event' : 'Create event'}
                    titleId="event-form-title"
                    description={
                        editing
                            ? 'Changes apply to the event as soon as you save.'
                            : 'Save as a draft to keep it private, or publish it for students and guests.'
                    }
                    onClose={requestClose}
                    closeDisabled={form.processing}
                    closeLabel="Close event form"
                />

                <ModalBody className="space-y-4 bg-slate-50/40">
                    {noLocations && (
                        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                            <AlertCircle size={18} className="mt-0.5 shrink-0" />
                            <p>
                                No campus locations are configured yet, so events cannot be saved.
                                Ask the system administrator to set up the predefined CCS locations.
                            </p>
                        </div>
                    )}

                    <Section title="Event details">
                        <div>
                            <label htmlFor="event-title" className={labelClass}>Event title</label>
                            <input {...field('title')} type="text" maxLength={255} required className={inputClass} placeholder="e.g. CCS Tech Summit 2026" />
                            <FieldError id="event-title-error" message={errors.title} />
                        </div>
                        <div>
                            <label htmlFor="event-description" className={labelClass}>Description</label>
                            <textarea {...field('description')} rows={5} maxLength={10000} required className={inputClass} placeholder="What is the event about?" />
                            <FieldError id="event-description-error" message={errors.description} />
                        </div>
                    </Section>

                    <Section title="Schedule" description="All times are Philippine time.">
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div>
                                <label htmlFor="event-event_date" className={labelClass}>Date</label>
                                <DateTimeInput {...field('event_date')} type="date" min={editing ? undefined : ccsNow().slice(0, 10)} required className={inputClass} />
                                <FieldError id="event-event_date-error" message={errors.event_date} />
                            </div>
                            <div>
                                <label htmlFor="event-start_time" className={labelClass}>Start time</label>
                                <DateTimeInput {...field('start_time')} type="time" required className={inputClass} />
                                <FieldError id="event-start_time-error" message={errors.start_time} />
                            </div>
                            <div>
                                <label htmlFor="event-end_time" className={labelClass}>End time</label>
                                <DateTimeInput {...field('end_time')} type="time" required className={inputClass} />
                                <FieldError id="event-end_time-error" message={errors.end_time} />
                            </div>
                        </div>
                        <div className="sm:max-w-sm">
                            <label htmlFor="event-registration_deadline" className={labelClass}>Registration deadline</label>
                            <DateTimeInput
                                {...field('registration_deadline')}
                                type="datetime-local"
                                min={deadline.min}
                                max={deadline.max}
                                required
                                aria-describedby={
                                    errors.registration_deadline
                                        ? 'event-registration_deadline-error'
                                        : 'event-registration_deadline-hint'
                                }
                                className={inputClass}
                            />
                            <FieldError id="event-registration_deadline-error" message={errors.registration_deadline} />
                            {!errors.registration_deadline && (
                                <p id="event-registration_deadline-hint" className="mt-1.5 text-xs text-slate-500">
                                    {startsAt
                                        ? `Must be later than now and no later than the event start (${formatDateTime(startsAt)}).`
                                        : 'Set the event date and start time first; the deadline must be on or before the start.'}
                                </p>
                            )}
                            {startsAt && form.data.registration_deadline !== startsAt && !form.processing && (
                                <button
                                    type="button"
                                    onClick={() => setField('registration_deadline', startsAt)}
                                    className="mt-1.5 text-xs font-semibold text-blue-700 hover:underline"
                                >
                                    Close registration when the event starts
                                </button>
                            )}
                        </div>
                    </Section>

                    <Section title="Venue and participants">
                        <div>
                            <label htmlFor="event-location_id" className={labelClass}>Location</label>
                            <select {...field('location_id')} required disabled={form.processing || noLocations} className={inputClass}>
                                <option value="">Select a campus location</option>
                                {locations.map((location) => (
                                    <option key={location.location_id} value={location.location_id}>
                                        {location.location_name}
                                        {location.building ? ` · ${location.building}` : ''}
                                        {location.room_number ? ` · Room ${location.room_number}` : ''}
                                    </option>
                                ))}
                            </select>
                            <FieldError id="event-location_id-error" message={errors.location_id} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
                            <div>
                                <label htmlFor="event-target_participants" className={labelClass}>Target participants</label>
                                <input {...field('target_participants')} type="text" maxLength={1000} required className={inputClass} placeholder="e.g. 3rd-year BSIT, all blocks" />
                                <FieldError id="event-target_participants-error" message={errors.target_participants} />
                            </div>
                            <div>
                                <label htmlFor="event-max_participants" className={labelClass}>Max participants</label>
                                <input {...field('max_participants')} type="number" min={Math.max(1, registered)} max={100000} step={1} inputMode="numeric" required className={inputClass} />
                                <FieldError id="event-max_participants-error" message={errors.max_participants} />
                            </div>
                        </div>
                    </Section>

                    <Section title="Poster or image" description="JPG, PNG or WEBP, up to 15 MB.">
                        <ImageDropzone
                            id="event-poster"
                            accept={POSTER_TYPES}
                            disabled={form.processing}
                            preview={currentPoster}
                            previewAlt="Poster preview"
                            title="Drag and drop the event poster here"
                            hint="JPG, PNG or WEBP · up to 15 MB"
                            invalid={Boolean(errors.poster)}
                            describedBy={errors.poster ? 'event-poster-error' : undefined}
                            onFiles={([file]) => choosePoster(file)}
                        />
                        {form.data.poster && (
                            <p className="truncate text-xs text-slate-500">
                                New poster: <span className="font-medium text-slate-700">{form.data.poster.name}</span>
                            </p>
                        )}
                        <FieldError id="event-poster-error" message={errors.poster} />
                    </Section>

                    <Section title="Proof photo" description="Decide whether attendees must upload a photo taken at the event.">
                        <label className="flex cursor-pointer items-start gap-3">
                            <input
                                type="checkbox"
                                checked={Boolean(form.data.proof_photo_required)}
                                onChange={(changeEvent) => setField('proof_photo_required', changeEvent.target.checked)}
                                disabled={form.processing || registered > 0}
                                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>
                                <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                                    <Camera size={16} className="text-blue-600" />
                                    Require a proof photo
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-500">
                                    {registered > 0
                                        ? `Fixed because ${registered} student${registered === 1 ? ' has' : 's have'} already registered.`
                                        : 'Students upload it during the window you set below. Recommended when attendance matters: a QR check-in alone can be forwarded, a reviewed photo cannot.'}
                                </span>
                            </span>
                        </label>
                        <FieldError id="event-proof_photo_required-error" message={errors.proof_photo_required} />

                        {form.data.proof_photo_required && (
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label htmlFor="event-proof_upload_start_at" className={labelClass}>Uploads open</label>
                                    <DateTimeInput {...field('proof_upload_start_at')} type="datetime-local" min={startsAt ?? undefined} required className={inputClass} />
                                    <FieldError id="event-proof_upload_start_at-error" message={errors.proof_upload_start_at} />
                                </div>
                                <div>
                                    <label htmlFor="event-proof_upload_end_at" className={labelClass}>Uploads close</label>
                                    <DateTimeInput {...field('proof_upload_end_at')} type="datetime-local" min={form.data.proof_upload_start_at || startsAt || undefined} required className={inputClass} />
                                    <FieldError id="event-proof_upload_end_at-error" message={errors.proof_upload_end_at} />
                                </div>
                            </div>
                        )}
                    </Section>
                </ModalBody>

                <ModalFooter>
                    {submitError && (
                        <p role="alert" className="mb-3 flex items-center gap-2 text-sm font-medium text-red-600">
                            <AlertCircle size={16} className="shrink-0" />
                            {submitError}
                        </p>
                    )}

                    {submission && (
                        <div className="mb-3" role="status" aria-live="polite">
                            <div className="flex justify-between text-xs font-medium text-slate-500">
                                <span>
                                    {submission.phase === 'processing' ? 'Saving on the server...' : 'Uploading...'}
                                </span>
                                {submission.percentage !== null && <span>{submission.percentage}%</span>}
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-100">
                                <div
                                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-200"
                                    style={{ width: `${submission.percentage ?? 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={requestClose}
                            disabled={form.processing}
                            className={ghostButtonClass}
                        >
                            Cancel
                        </button>

                        {editing ? (
                            <button
                                type="submit"
                                disabled={form.processing || noLocations}
                                className={primaryButtonClass}
                            >
                                {form.processing ? 'Saving changes...' : 'Save changes'}
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => submit('Draft')}
                                    disabled={form.processing || noLocations}
                                    className={secondaryButtonClass}
                                >
                                    {form.processing && intent === 'Draft' ? 'Saving draft...' : 'Save as draft'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={form.processing || noLocations}
                                    className={primaryButtonClass}
                                >
                                    <Send size={16} />
                                    {form.processing && intent === 'Published' ? 'Publishing...' : 'Save and publish'}
                                </button>
                            </>
                        )}
                    </div>
                </ModalFooter>
            </FormModal>

            <ConfirmDialog
                open={confirmDiscard}
                icon={AlertCircle}
                title="Discard changes?"
                confirmLabel="Discard"
                tone="danger"
                onCancel={() => setConfirmDiscard(false)}
                onConfirm={() => {
                    setConfirmDiscard(false);
                    onClose();
                }}
            >
                Your unsaved changes to this event will be lost.
            </ConfirmDialog>
        </>
    );
}
