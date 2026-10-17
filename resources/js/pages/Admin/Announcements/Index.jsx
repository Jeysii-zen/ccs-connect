import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import { describeSubmission } from '@/lib/uploadProgress';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    FileImage,
    Globe,
    Megaphone,
    Pencil,
    Plus,
    Search,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'text-sm font-semibold text-slate-700';

function FieldError({ message }) {
    if (!message) return null;

    return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

function formatDate(value) {
    if (!value) return 'No date';

    const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00');

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatDateTime(value) {
    if (!value) return 'Not published';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Not published';

    return date.toLocaleString('en-PH', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Manila',
    });
}

function imageUrl(path) {
    return `/storage/${String(path ?? '').replace(/^\/+/, '')}`;
}

// "5m", "3h", "2d" for recent posts, then a short date, like a news feed.
function formatFeedTime(value) {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    const seconds = Math.round((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`;

    return date.toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
    });
}

function creatorName(announcement) {
    const name = `${announcement.creator?.first_name ?? ''} ${announcement.creator?.last_name ?? ''}`.trim();

    return name || 'CCS Connect';
}

function initialsOf(name) {
    return name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0] ?? '')
        .join('')
        .toUpperCase();
}

// Facebook-style photo grid: 1 full, 2 side by side, 3 = one tall + two,
// 4+ = 2x2 with a "+N" overlay on the last tile.
function PostImages({ images }) {
    if (!images?.length) return null;

    const shown = images.slice(0, 4);
    const extra = images.length - shown.length;
    const alt = (index) => `Announcement image ${index + 1} of ${images.length}`;

    if (shown.length === 1) {
        return (
            <img
                src={imageUrl(shown[0].image_path)}
                alt={alt(0)}
                className="max-h-[30rem] w-full bg-slate-100 object-cover"
            />
        );
    }

    return (
        <div
            className={`grid gap-0.5 bg-white ${
                shown.length === 3
                    ? 'aspect-[4/3] grid-cols-2 grid-rows-2'
                    : 'grid-cols-2'
            }`}
        >
            {shown.map((image, index) => (
                <div
                    key={image.announcement_image_id}
                    className={`relative overflow-hidden bg-slate-100 ${
                        shown.length === 3
                            ? index === 0
                                ? 'row-span-2'
                                : ''
                            : 'aspect-square'
                    }`}
                >
                    <img
                        src={imageUrl(image.image_path)}
                        alt={alt(index)}
                        className="h-full w-full object-cover"
                    />

                    {extra > 0 && index === shown.length - 1 && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-3xl font-bold text-white">
                            +{extra}
                            <span className="sr-only"> more images</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const SEE_MORE_LENGTH = 320;

// Feed preview: long text is clipped; the whole post opens the full view.
function PostText({ text }) {
    const content = text ?? '';
    const long = content.length > SEE_MORE_LENGTH || content.split('\n').length > 5;

    return (
        <div className="text-[15px] leading-6 text-slate-800">
            <p
                className={`whitespace-pre-line break-words ${
                    long ? 'line-clamp-5' : ''
                }`}
            >
                {content}
            </p>

            {long && (
                <span className="mt-1 inline-block text-sm font-semibold text-slate-500 group-hover:underline">
                    See more
                </span>
            )}
        </div>
    );
}

function FeedPost({ announcement, onOpen, onEdit, onDelete }) {
    const name = creatorName(announcement);

    return (
        <article
            className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:shadow-md"
            aria-labelledby={`post-title-${announcement.announcement_id}`}
        >
            {/* Header: author, time, audience */}
            <header className="flex items-center gap-3 px-4 pb-3 pt-4">
                <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white"
                    aria-hidden="true"
                >
                    {initialsOf(name)}
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-slate-900">
                        {name}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-500">
                        <time
                            dateTime={announcement.published_at ?? undefined}
                            title={formatDateTime(announcement.published_at)}
                        >
                            {formatFeedTime(announcement.published_at)}
                        </time>
                        <span aria-hidden="true">·</span>
                        <Globe size={12} aria-hidden="true" />
                        <span className="sr-only">Published to the CCS community</span>
                    </p>
                </div>
            </header>

            {/* Body */}
            <div className="space-y-1.5 px-4 pb-3">
                <h3
                    id={`post-title-${announcement.announcement_id}`}
                    className="break-words text-base font-bold text-slate-950"
                >
                    {announcement.title}
                </h3>
                <PostText text={announcement.description_content} />
            </div>

            <PostImages images={announcement.images} />

            {/* Covers the whole post (placed after the images so it sits on top
                of their overlays); the action bar is raised above it. */}
            <button
                type="button"
                onClick={() => onOpen(announcement)}
                className="absolute inset-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                aria-label={`Open announcement: ${announcement.title}`}
            />

            {/* Action bar */}
            <div className="relative z-10 mx-4 grid grid-cols-2 border-t border-slate-200 py-1">
                <button
                    type="button"
                    onClick={() => onEdit(announcement)}
                    className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                >
                    <Pencil size={17} />
                    Edit
                </button>
                <button
                    type="button"
                    onClick={() => onDelete(announcement)}
                    className="flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                    <Trash2 size={17} />
                    Delete
                </button>
            </div>
        </article>
    );
}

function Notification({ notification, onClose }) {
    if (!notification) return null;

    const success = notification.type === 'success';

    return (
        <div
            role="status"
            className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 ${
                success
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-red-200 bg-red-50 text-red-800'
            }`}
        >
            {success ? (
                <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            ) : (
                <AlertCircle size={20} className="mt-0.5 shrink-0" />
            )}

            <p className="flex-1 text-sm font-medium">{notification.message}</p>

            <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
                aria-label="Dismiss notification"
            >
                <X size={16} />
            </button>
        </div>
    );
}

const submissionTitles = {
    publish: 'Publishing announcement',
    schedule: 'Scheduling announcement',
    save: 'Saving changes',
    draft: 'Saving draft',
};

const submittingLabels = {
    publish: 'Publishing announcement...',
    schedule: 'Scheduling announcement...',
    save: 'Saving changes...',
    draft: 'Saving draft...',
};

// Floating lower-right status, rendered into <body> so the modal panel's
// overflow and the overlay's backdrop filter cannot clip or move it.
function SubmissionProgressToast({ processing, progress, intent }) {
    const state = describeSubmission(processing, progress);

    if (!state || typeof document === 'undefined') return null;

    const determinate = state.percentage !== null;
    const detail = {
        starting: 'Uploading...',
        uploading: 'Uploading...',
        processing: 'Upload complete. Saving on the server...',
    }[state.phase];

    return createPortal(
        <div className="pointer-events-none fixed bottom-4 right-4 z-[150] w-[min(22rem,calc(100vw-2rem))]">
            <div className="rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-2xl shadow-blue-900/15 ring-1 ring-slate-900/5 backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                    {/* Announces phase changes only, not every percent. */}
                    <div role="status" aria-live="polite" className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                            {submissionTitles[intent] ?? submissionTitles.publish}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
                    </div>

                    {determinate && (
                        <span
                            className="shrink-0 text-lg font-bold tabular-nums text-blue-700"
                            aria-hidden="true"
                        >
                            {state.percentage}%
                        </span>
                    )}
                </div>

                <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100"
                    role="progressbar"
                    aria-label="Announcement upload progress"
                    {...(determinate
                        ? {
                              'aria-valuemin': 0,
                              'aria-valuemax': 100,
                              'aria-valuenow': state.percentage,
                          }
                        : { 'aria-valuetext': detail })}
                >
                    {determinate ? (
                        <div
                            className={`h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-200 ${
                                state.phase === 'processing' ? 'animate-pulse' : ''
                            }`}
                            style={{ width: `${state.percentage}%` }}
                        />
                    ) : (
                        <div className="ml-[30%] h-full w-2/5 animate-indeterminate rounded-full bg-gradient-to-r from-blue-600 to-cyan-500" />
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}

function AnnouncementFormModal({
    announcement,
    onClose,
    onSaved,
    scheduleMode = false,
}) {
    const editing = Boolean(announcement);
    const isScheduling = scheduleMode && !editing;
    const fileInputRef = useRef(null);

    const form = useForm({
        title: announcement?.title ?? '',
        description_content: announcement?.description_content ?? '',
        announcement_status: scheduleMode
            ? 'Scheduled'
            : announcement?.announcement_status ?? 'Published',
        scheduled_at: announcement?.scheduled_at ?? '',
        images: [],
        remove_image_ids: [],
        ...(editing ? { _method: 'put' } : {}),
    });

    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');

    const [imagePreviews, setImagePreviews] = useState([]);
    const [removedImageIds, setRemovedImageIds] = useState([]);
    const [submitError, setSubmitError] = useState('');
    const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [submitIntent, setSubmitIntent] = useState('publish');

    // No response arrived, so the outcome is unknown; never claim success.
    const handleNetworkError = () => {
        setSubmitError(
            'The connection was interrupted, so the announcement may not have been saved. Check your connection and try again.',
        );

        return false;
    };

    useEffect(() => {
        const previews = form.data.images.map((file, index) => ({
            key: `${file.name}-${file.lastModified}-${index}`,
            name: file.name,
            url: URL.createObjectURL(file),
        }));

        setImagePreviews(previews);

        return () => previews.forEach((preview) => URL.revokeObjectURL(preview.url));
    }, [form.data.images]);

    const existingImages = (announcement?.images ?? []).filter(
        (image) => !removedImageIds.includes(image.announcement_image_id),
    );

    const updateField = (event) => {
        const { name, value } = event.target;
        form.setData(name, value);
        setSubmitError('');
    };



    const addImages = (files) => {
        const selectedFiles = Array.from(files ?? []);
        const remainingSlots = Math.max(0, 10 - form.data.images.length);

        if (selectedFiles.length > remainingSlots) {
            setSubmitError('You can upload a maximum of 10 new images.');
        } else {
            setSubmitError('');
        }

        const acceptedFiles = selectedFiles.slice(0, remainingSlots);

        if (acceptedFiles.length > 0) {
            form.setData('images', [
                ...form.data.images,
                ...acceptedFiles,
            ]);
        }
    };

    const selectImages = (event) => {
        addImages(event.target.files);

        // Allow the same file to be selected again later.
        event.target.value = '';
    };

    const handleDragOver = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (event) => {
        event.preventDefault();
        event.stopPropagation();

        // Ignore transitions between children inside the upload area.
        if (!event.currentTarget.contains(event.relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (form.processing) return;

        addImages(event.dataTransfer.files);
    };



    const removeNewImage = (index) => {
        form.setData(
            'images',
            form.data.images.filter((_, imageIndex) => imageIndex !== index),
        );
    };

    const toggleExistingImage = (imageId) => {
        setRemovedImageIds((current) =>
            current.includes(imageId)
                ? current.filter((id) => id !== imageId)
                : [...current, imageId],
        );
    };

    const hasUnsavedChanges =
        form.data.title.trim() !== '' ||
        form.data.description_content.trim() !== '' ||
        form.data.images.length > 0 ||
        removedImageIds.length > 0;

    const requestClose = () => {
        if (form.processing) return;

        if (hasUnsavedChanges) {
            setShowCancelConfirmation(true);
            return;
        }

        onClose();
    };

    const discardChanges = () => {
        if (form.processing) return;

        setShowCancelConfirmation(false);
        onClose();
    };

    const saveAsDraft = () => {
        if (form.processing) return;

        setSubmitIntent('draft');
        form.setData('announcement_status', 'Draft');

        // Wait for React to apply the status before submitting.
        form.transform((data) => ({
            ...data,
            announcement_status: 'Draft',
            remove_image_ids: removedImageIds,
        }));

        const url = editing
            ? route('admin.announcements.update', announcement.announcement_id)
            : route('admin.announcements.store');

        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setShowCancelConfirmation(false);
                form.reset();
                onSaved();
            },
            onError: (errors) => {
                const firstError = Object.values(errors ?? {})[0];

                setSubmitError(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Unable to save the draft. Please check the form.',
                );
                setShowCancelConfirmation(false);
            },
            onNetworkError: () => {
                setShowCancelConfirmation(false);

                return handleNetworkError();
            },
        });
    };

    const submit = (event) => {
        event.preventDefault();

        if (form.processing) return;

        setSubmitError('');
        setSubmitIntent(isScheduling ? 'schedule' : editing ? 'save' : 'publish');

        form.transform((data) => ({
            ...data,
            announcement_status: isScheduling
                ? 'Scheduled'
                : editing
                ? data.announcement_status
                : 'Published',
            remove_image_ids: removedImageIds,
        }));

        const url = editing
            ? route('admin.announcements.update', announcement.announcement_id)
            : route('admin.announcements.store');

        form.post(url, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onSaved();
            },
            onError: (errors) => {
                const firstError = Object.values(errors ?? {})[0];
                setSubmitError(
                    typeof firstError === 'string'
                        ? firstError
                        : 'Please check the form fields and uploaded images.',
                );
            },
            onNetworkError: handleNetworkError,
        });
    };

    // While a request runs the modal is hidden (but stays mounted, so the
    // form state and progress survive) and only the progress toast shows.
    // It comes back with the user's input if the request fails. The
    // transparent layer blocks clicks that would start another visit and
    // cancel the upload.
    const submitting = form.processing;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto p-3 transition-[background-color,backdrop-filter] duration-300 sm:items-center sm:p-6 ${
                submitting
                    ? 'cursor-progress bg-transparent delay-300'
                    : 'bg-slate-950/50 backdrop-blur-sm'
            }`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !form.processing) {
                    requestClose();
                }
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="announcement-form-title"
                // inert (not aria-hidden): also releases focus from the
                // clicked submit button, so nothing focused is hidden.
                inert={submitting}
                className={`my-auto flex w-[min(48rem,calc(100vw-2rem))] max-h-[min(90vh,800px)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl transition-[opacity,visibility] duration-300 ${
                    // Brief delay so the "Publishing announcement..." label is seen.
                    submitting ? 'invisible opacity-0 delay-300' : ''
                }`}
            >
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 sm:px-7">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                            Information dissemination
                        </p>
                        <h2
                            id="announcement-form-title"
                            className="mt-1 text-xl font-bold text-slate-950 sm:text-2xl"
                        >
                            {editing
                                ? 'Edit announcement'
                                : isScheduling
                                ? 'Schedule announcement'
                                : 'Create announcement'}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {editing
                                ? 'Update the announcement details and images.'
                                : isScheduling
                                ? 'Prepare an announcement for publication at a future date and time.'
                                : 'Prepare an announcement for the CCS community.'}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={requestClose}
                        disabled={form.processing}
                        className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
                        aria-label="Close form"
                    >
                        <X size={19} />
                    </button>
                </div>

                <form
                    onSubmit={submit}
                    className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-7"
                >
                    {/* Field errors stay inline under each field after this
                        dialog is closed, so the user can fix them and retry. */}
                    {submitError && (
                        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
                            <div
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="announcement-error-title"
                                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="rounded-xl bg-red-50 p-3 text-red-600">
                                        <AlertCircle size={22} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3
                                            id="announcement-error-title"
                                            className="text-lg font-bold text-slate-900"
                                        >
                                            Submission failed
                                        </h3>

                                        <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                                            {submitError}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setSubmitError('')}
                                        className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                                    >
                                        Close
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <label htmlFor="title" className={labelClass}>
                            Announcement title <span className="text-red-500">*</span>
                        </label>
                        <input
                            id="title"
                            name="title"
                            value={form.data.title}
                            onChange={updateField}
                            maxLength={255}
                            required
                            placeholder="Enter a clear announcement title"
                            className={inputClass}
                        />
                        <FieldError message={form.errors.title} />
                    </div>

                    <div>
                        <label htmlFor="description_content" className={labelClass}>
                            Description <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="description_content"
                            name="description_content"
                            value={form.data.description_content}
                            onChange={updateField}
                            required
                            rows={6}
                            placeholder="Write the announcement details..."
                            className={`${inputClass} min-h-36 resize-y`}
                        />
                        <FieldError message={form.errors.description_content} />
                    </div>


                    {isScheduling && (
                        <div className="space-y-4">
                            <div>
                                <label
                                    htmlFor="scheduled_date"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Schedule date
                                    <span className="text-red-500"> *</span>
                                </label>

                                <input
                                    id="scheduled_date"
                                    name="scheduled_date"
                                    type="date"
                                    value={scheduleDate}
                                    min={new Date(
                                        Date.now() -
                                            new Date().getTimezoneOffset() * 60000,
                                    )
                                        .toISOString()
                                        .slice(0, 10)}
                                    onChange={(event) => {
                                        const date = event.target.value;
                                        setScheduleDate(date);
                                        form.setData(
                                            'scheduled_at',
                                            date && scheduleTime
                                                ? `${date}T${scheduleTime}`
                                                : '',
                                        );
                                        setSubmitError('');
                                    }}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="scheduled_time"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Schedule time
                                    <span className="text-red-500"> *</span>
                                </label>

                                <input
                                    id="scheduled_time"
                                    name="scheduled_time"
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(event) => {
                                        const time = event.target.value;
                                        setScheduleTime(time);
                                        form.setData(
                                            'scheduled_at',
                                            scheduleDate && time
                                                ? `${scheduleDate}T${time}`
                                                : '',
                                        );
                                        setSubmitError('');
                                    }}
                                    required
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <FieldError message={form.errors.scheduled_at} />

                            <p className="text-xs text-slate-500">
                                Choose a future date and time in Philippine time (Asia/Manila).
                            </p>
                        </div>
                    )}


                    {editing && (announcement.images ?? []).length > 0 && (
                        <div>
                            <p className={labelClass}>Existing images</p>
                            <p className="mt-1 text-xs text-slate-500">
                                Select an image to mark it for removal when you save.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {(announcement.images ?? []).map((image) => {
                                    const marked = removedImageIds.includes(
                                        image.announcement_image_id,
                                    );

                                    return (
                                        <button
                                            key={image.announcement_image_id}
                                            type="button"
                                            onClick={() =>
                                                toggleExistingImage(
                                                    image.announcement_image_id,
                                                )
                                            }
                                            className={`group relative overflow-hidden rounded-xl border-2 text-left ${
                                                marked
                                                    ? 'border-red-400 opacity-50'
                                                    : 'border-slate-200 hover:border-blue-400'
                                            }`}
                                            aria-pressed={marked}
                                            title={marked ? 'Undo image removal' : 'Mark image for removal'}
                                        >
                                            <img
                                                src={imageUrl(image.image_path)}
                                                alt="Existing announcement"
                                                className="h-28 w-full object-cover"
                                            />
                                            <span
                                                className={`block truncate px-2 py-2 text-xs font-semibold ${
                                                    marked ? 'text-red-700' : 'text-slate-600'
                                                }`}
                                            >
                                                {marked ? 'Marked for removal' : 'Keep image'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className={labelClass}>
                                Images <span className="font-normal text-slate-400">(optional)</span>
                            </label>
                            <span className="text-xs text-slate-500">
                                JPG, PNG, or WebP · up to 15 MB each
                            </span>
                        </div>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                            multiple
                            onChange={selectImages}
                            className="sr-only"
                            aria-label="Choose announcement images"
                        />

                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={`mt-3 flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100'
                                    : 'border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/50'
                            } ${form.processing ? 'pointer-events-none opacity-60' : ''}`}
                        >
                            <span className="mb-2 rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                                <Upload size={21} />
                            </span>

                            <span className="text-sm font-semibold text-slate-700">
                                {isDragging ? 'Drop images here' : 'Drag and drop images here'}
                            </span>

                            <span className="mt-1 text-xs text-slate-500">
                                or choose images from your computer
                            </span>

                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={form.processing}
                                className="mt-4 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                Choose image files
                            </button>

                            <span className="mt-3 text-xs text-slate-500">
                                {form.data.images.length}/10 new images selected · JPG, PNG, or WebP
                            </span>
                        </div>

                        <FieldError message={form.errors.images} />

                        <FieldError
                            message={Object.entries(form.errors).find(([key]) =>
                                key.startsWith('images.'),
                            )?.[1]}
                        />

                        {imagePreviews.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {imagePreviews.map((preview, index) => (
                                    <div
                                        key={preview.key}
                                        className="overflow-hidden rounded-xl border border-slate-200"
                                    >
                                        <img
                                            src={preview.url}
                                            alt={preview.name}
                                            className="h-28 w-full object-cover"
                                        />
                                        <div className="flex items-center gap-2 p-2">
                                            <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                                                {preview.name}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeNewImage(index)}
                                                className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                                                aria-label={`Remove ${preview.name}`}
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={requestClose}
                            disabled={form.processing}
                            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {form.processing ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            ) : (
                                <CheckCircle2 size={17} />
                            )}
                            {form.processing
                                ? submittingLabels[submitIntent] ?? 'Saving...'
                                : isScheduling
                                ? 'Schedule announcement'
                                : editing
                                    ? 'Save changes'
                                    : 'Publish Announcement'}
                        </button>
                    </div>
                </form>
            </div>

            {showCancelConfirmation && !submitting && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowCancelConfirmation(false);
                        }
                    }}
                >
                    <div
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="cancel-confirmation-title"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start gap-3">
                            <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                                <AlertCircle size={22} />
                            </div>

                            <div>
                                <h3
                                    id="cancel-confirmation-title"
                                    className="text-lg font-bold text-slate-900"
                                >
                                    Save your changes?
                                </h3>

                                <p className="mt-1 text-sm leading-6 text-slate-600">
                                    You have entered announcement details.
                                    Would you like to save them as a draft
                                    before closing?
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={saveAsDraft}
                                disabled={form.processing}
                                className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                            >
                                Save as Draft
                            </button>

                            <button
                                type="button"
                                onClick={discardChanges}
                                disabled={form.processing}
                                className="rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                            >
                                Discard changes
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowCancelConfirmation(false)}
                                disabled={form.processing}
                                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                            >
                                Continue editing
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <SubmissionProgressToast
                processing={form.processing}
                progress={form.progress}
                intent={submitIntent}
            />
        </div>
    );
}

// Full view of one announcement, opened by clicking its feed post.
function AnnouncementViewModal({ announcement, onClose, onEdit, onDelete }) {
    const [imageIndex, setImageIndex] = useState(0);
    const closeButtonRef = useRef(null);
    const images = announcement.images ?? [];
    const image = images[imageIndex];
    const name = creatorName(announcement);
    const titleId = `view-announcement-title-${announcement.announcement_id}`;

    const showImage = (index) =>
        setImageIndex((index + images.length) % images.length);

    useEffect(() => {
        // Return focus to the post that opened the modal.
        const opener = document.activeElement;
        closeButtonRef.current?.focus();

        return () => opener?.focus?.();
    }, []);

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            } else if (images.length > 1 && event.key === 'ArrowRight') {
                setImageIndex((index) => (index + 1) % images.length);
            } else if (images.length > 1 && event.key === 'ArrowLeft') {
                setImageIndex((index) => (index - 1 + images.length) % images.length);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [images.length, onClose]);

    return (
        <div
            className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="flex max-h-[min(92vh,900px)] w-[min(52rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
                {/* Header: author and exact publish time */}
                <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
                    <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 text-sm font-bold text-white"
                        aria-hidden="true"
                    >
                        {initialsOf(name)}
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-slate-900">{name}</p>
                        <p className="flex items-center gap-1 text-xs text-slate-500">
                            <time dateTime={announcement.published_at ?? undefined}>
                                {formatDateTime(announcement.published_at)}
                            </time>
                            <span aria-hidden="true">·</span>
                            <Globe size={12} aria-hidden="true" />
                            <span className="sr-only">Published to the CCS community</span>
                        </p>
                    </div>

                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Close announcement"
                    >
                        <X size={20} />
                    </button>
                </header>

                {/* Body: full text and image viewer */}
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                    <div className="space-y-3 px-5 py-4">
                        <h2
                            id={titleId}
                            className="break-words text-xl font-bold text-slate-950"
                        >
                            {announcement.title}
                        </h2>
                        <p className="whitespace-pre-line break-words text-[15px] leading-7 text-slate-800">
                            {announcement.description_content}
                        </p>
                    </div>

                    {image && (
                        <div className="bg-slate-950">
                            <div className="relative flex items-center justify-center">
                                <img
                                    key={image.announcement_image_id}
                                    src={imageUrl(image.image_path)}
                                    alt={`Announcement image ${imageIndex + 1} of ${images.length}`}
                                    className="max-h-[60vh] w-full object-contain"
                                />

                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => showImage(imageIndex - 1)}
                                            className="absolute left-3 rounded-full bg-white/90 p-2 text-slate-800 shadow-lg transition hover:bg-white"
                                            aria-label="Previous image"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => showImage(imageIndex + 1)}
                                            className="absolute right-3 rounded-full bg-white/90 p-2 text-slate-800 shadow-lg transition hover:bg-white"
                                            aria-label="Next image"
                                        >
                                            <ChevronRight size={20} />
                                        </button>
                                        <span
                                            className="absolute bottom-3 right-3 rounded-full bg-slate-950/70 px-2.5 py-1 text-xs font-semibold text-white"
                                            aria-live="polite"
                                        >
                                            {imageIndex + 1} / {images.length}
                                        </span>
                                    </>
                                )}
                            </div>

                            {images.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto bg-slate-900 p-2 [scrollbar-width:thin]">
                                    {images.map((thumb, index) => (
                                        <button
                                            key={thumb.announcement_image_id}
                                            type="button"
                                            onClick={() => setImageIndex(index)}
                                            className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                                                index === imageIndex
                                                    ? 'ring-cyan-400'
                                                    : 'opacity-60 ring-transparent hover:opacity-100'
                                            }`}
                                            aria-label={`Show image ${index + 1}`}
                                            aria-current={index === imageIndex || undefined}
                                        >
                                            <img
                                                src={imageUrl(thumb.image_path)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-100 px-5 py-3">
                    <button
                        type="button"
                        onClick={() => onEdit(announcement)}
                        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                        <Pencil size={17} />
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => onDelete(announcement)}
                        className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
                    >
                        <Trash2 size={17} />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

function PublishConfirmation({ announcement, processing, onCancel, onConfirm }) {
    if (!announcement) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="publish-announcement-title"
                aria-describedby="publish-announcement-description"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                    <Megaphone size={22} />
                </div>
                <h2
                    id="publish-announcement-title"
                    className="text-xl font-bold text-slate-950"
                >
                    Post this announcement?
                </h2>
                <p
                    id="publish-announcement-description"
                    className="mt-2 text-sm leading-6 text-slate-600"
                >
                    <strong className="break-words">{announcement.title}</strong> will
                    be published now and moved from Drafts to Announcements.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                        {processing ? (
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                            <Megaphone size={16} />
                        )}
                        {processing ? 'Posting announcement...' : 'Post announcement'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function DeleteConfirmation({ announcement, processing, onCancel, onConfirm }) {
    if (!announcement) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-announcement-title"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <Trash2 size={22} />
                </div>
                <h2
                    id="delete-announcement-title"
                    className="text-xl font-bold text-slate-950"
                >
                    Delete announcement?
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                    You are about to delete <strong>{announcement.title}</strong>.
                    This action cannot be undone, and its stored images will also be removed.
                </p>
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={processing}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={processing}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                        <Trash2 size={16} />
                        {processing ? 'Deleting...' : 'Delete announcement'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Index() {
    const page = usePage();
    const announcements = page.props.announcements;
    const currentView = page.props.currentView ?? 'announcements';
    const announcementCounts = page.props.announcementCounts ?? {
        announcements: 0,
        drafts: 0,
        schedule: 0,
    };
    const [search, setSearch] = useState('');
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [creating, setCreating] = useState(false);
    const [deletingAnnouncement, setDeletingAnnouncement] = useState(null);
    const [deleteProcessing, setDeleteProcessing] = useState(false);
    const [publishingAnnouncement, setPublishingAnnouncement] = useState(null);
    const [viewingAnnouncement, setViewingAnnouncement] = useState(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const loadingMoreRef = useRef(false);
    const feedEndRef = useRef(null);

    // The feed's current size; the 5-second refresh must ask for the same
    // amount or it would shrink the list back to the first 10 posts.
    const feedLimitRef = useRef(10);
    feedLimitRef.current = announcements?.per_page ?? 10;
    const [publishProcessing, setPublishProcessing] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        const success = page.props.flash?.success;

        if (success) {
            setNotification({ type: 'success', message: success });
        }
    }, [page.props.flash?.success]);

    useEffect(() => {
        if (!notification) return undefined;

        const timeout = window.setTimeout(() => setNotification(null), 5000);

        return () => window.clearTimeout(timeout);
    }, [notification]);

    useEffect(() => {
        const params = new URLSearchParams(page.url.split('?')[1] ?? '');

        if (params.get('create') === '1') {
            setCreating(true);
        }
    }, []);


    useEffect(() => {
        let refreshing = false;
        let navigating = false;

        // A refresh reloads the *current* URL; firing one mid-navigation
        // would interrupt the visit and roll the page back to this view.
        const offStart = router.on('start', (event) => {
            if (!event.detail.visit.only?.length) {
                navigating = true;
            }
        });
        const offFinish = router.on('finish', (event) => {
            if (!event.detail.visit.only?.length) {
                navigating = false;
            }
        });

        const refreshAnnouncements = () => {
            // Avoid refreshing while the page is hidden or a request is running.
            if (
                document.hidden ||
                refreshing ||
                navigating ||
                loadingMoreRef.current ||
                creating ||
                editingAnnouncement ||
                deletingAnnouncement ||
                publishingAnnouncement ||
                viewingAnnouncement ||
                page.url.includes('create=1')
            ) {
                return;
            }

            refreshing = true;

            router.reload({
                only: ['announcements', 'announcementCounts'],
                preserveState: true,
                preserveScroll: true,
                ...(currentView === 'announcements'
                    ? { data: { limit: feedLimitRef.current }, preserveUrl: true }
                    : {}),
                onFinish: () => {
                    refreshing = false;
                },
            });
        };

        const interval = window.setInterval(refreshAnnouncements, 5000);

        return () => {
            window.clearInterval(interval);
            offStart();
            offFinish();
        };
    }, [
        creating,
        editingAnnouncement,
        deletingAnnouncement,
        publishingAnnouncement,
        viewingAnnouncement,
        currentView,
        page.url,
    ]);


    const pageTitle =
        {
            drafts: 'Drafts',
            schedule: 'Schedule Announcement',
        }[currentView] ?? 'Announcements';

    const feedView = currentView === 'announcements';

    const searchInput = (
        <div className="relative">
            <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this page..."
                aria-label="Search announcements on this page"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:w-56"
            />
        </div>
    );

    const items = announcements?.data ?? [];
    const feedHasMore = feedView && (announcements?.total ?? 0) > items.length;

    const loadMoreFeed = () => {
        if (loadingMoreRef.current || !feedHasMore) return;

        loadingMoreRef.current = true;
        setLoadingMore(true);

        // Always from the first post: the server returns the first N.
        router.reload({
            only: ['announcements', 'announcementCounts'],
            data: { limit: feedLimitRef.current + 10 },
            preserveUrl: true,
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                loadingMoreRef.current = false;
                setLoadingMore(false);
            },
        });
    };

    // Load the next posts when the end of the feed comes near. A fresh
    // observer per batch re-checks visibility, so a short feed keeps filling.
    useEffect(() => {
        const end = feedEndRef.current;

        if (!feedHasMore || loadingMore || !end) return undefined;

        // The feed scrolls with the page, so watch the viewport itself.
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    loadMoreFeed();
                }
            },
            { rootMargin: '0px 0px 400px 0px' },
        );

        observer.observe(end);

        return () => observer.disconnect();
    }, [feedHasMore, loadingMore, items.length]);
    const filteredItems = items.filter((item) =>
        `${item.title ?? ''} ${item.description_content ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase()),
    );

    const startDelete = () => {
        if (!deletingAnnouncement) return;

        router.delete(
            route('admin.announcements.destroy', deletingAnnouncement.announcement_id),
            {
                preserveScroll: true,
                onStart: () => setDeleteProcessing(true),
                onSuccess: () => {
                    setDeletingAnnouncement(null);
                    setNotification({
                        type: 'success',
                        message: page.props.flash?.success ?? 'Announcement deleted successfully.',
                    });
                },
                onError: () => {
                    setNotification({
                        type: 'error',
                        message: 'Unable to delete the announcement. Please try again.',
                    });
                },
                onFinish: () => setDeleteProcessing(false),
            },
        );
    };


    const requestPublish = (announcement) => {
        if (announcement?.announcement_status === 'Draft') {
            setPublishingAnnouncement(announcement);
        }
    };

    const publishDraft = () => {
        const announcement = publishingAnnouncement;

        if (!announcement || publishProcessing) return;

        router.put(
            route(
                'admin.announcements.update',
                announcement.announcement_id,
            ),
            {
                title: announcement.title,
                description_content: announcement.description_content,
                announcement_status: 'Published',
                remove_image_ids: [],
            },
            {
                preserveScroll: true,
                onStart: () => setPublishProcessing(true),
                onSuccess: () => {
                    setPublishingAnnouncement(null);
                    setNotification({
                        type: 'success',
                        message: 'Announcement published successfully.',
                    });
                },
                onError: () => {
                    setPublishingAnnouncement(null);
                    setNotification({
                        type: 'error',
                        message: 'Unable to publish the draft. Please try again.',
                    });
                },
                onFinish: () => setPublishProcessing(false),
            },
        );
    };


    const openCreate = () => {
        setEditingAnnouncement(null);
        setCreating(true);
    };

    const openEdit = (announcement) => {
        setCreating(false);
        setEditingAnnouncement(announcement);
    };

    const closeForm = () => {
        setCreating(false);
        setEditingAnnouncement(null);

        // Opened from the sidebar's "Create Announcement" link: drop ?create=1
        // so the sidebar highlight, auto-refresh and reloads behave normally.
        if (new URLSearchParams(window.location.search).get('create') === '1') {
            router.get(
                route('admin.announcements.index', { view: currentView }),
                {},
                {
                    replace: true,
                    preserveState: true,
                    preserveScroll: true,
                    only: ['announcements', 'announcementCounts', 'currentView'],
                },
            );
        }
    };

    const handleSaved = () => {
        closeForm();
        setNotification({
            type: 'success',
            message: page.props.flash?.success ??
                (editingAnnouncement
                    ? 'Announcement updated successfully.'
                    : 'Announcement created successfully.'),
        });
    };

    return (
        <AdminConnectLayout>
            <Head title={pageTitle} />

            {/* Feed: scrolls with the page (the browser's own scrollbar) under a
                sticky title row. Drafts/Schedule: the page fits the viewport
                below the top bar (layout pt-24 + pb-8 = 8rem) and never
                scrolls; only their table or card scrolls inside. */}
            <div
                className={
                    feedView
                        ? 'mx-auto max-w-7xl'
                        : 'mx-auto flex h-[calc(100dvh-8rem)] min-h-[24rem] max-w-7xl flex-col pt-5 sm:pt-7'
                }
            >
                {/* -mt-24 reaches up under the top bar so posts never show
                    above the title row; its fade replaces a hard edge. */}
                <div
                    className={
                        feedView
                            ? 'sticky top-0 z-20 -mt-24 bg-slate-50/90 pt-[7.25rem] backdrop-blur-md sm:pt-[7.75rem]'
                            : 'shrink-0'
                    }
                >
                <div className="mb-6 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">
                            CCS Connect · Administration
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                            {pageTitle}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                            Create, update, and publish announcements for the CCS community.
                        </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        {feedView && searchInput}

                        {currentView === 'announcements' && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                <Plus size={18} />
                                Create announcement
                            </button>
                        )}

                        {currentView === 'schedule' && (
                            <button
                                type="button"
                                onClick={openCreate}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:bg-blue-50"
                            >
                                <CalendarDays size={18} />
                                Create scheduled announcement
                            </button>
                        )}
                    </div>
                </div>


                <Notification
                    notification={notification}
                    onClose={() => setNotification(null)}
                />

                {feedView && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-full h-8 bg-gradient-to-b from-slate-50/90 to-transparent"
                    />
                )}
                </div>

                {feedView && (
                    // Soft bottom edge where posts leave the viewport.
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed inset-x-0 bottom-0 z-10 h-12 bg-gradient-to-t from-slate-50 to-transparent"
                    />
                )}

                <section
                    className={
                        feedView
                            ? ''
                            : 'flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm'
                    }
                >
                    {!feedView && (
                    <div className="flex shrink-0 flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                        <div>
                            <h2 className="font-bold text-slate-950">
                                {{
                                    announcements: 'Published announcements',
                                    drafts: 'Draft announcements',
                                    schedule: 'Scheduled announcements',
                                }[currentView] ?? 'Announcements'}
                            </h2>
                            <p className="mt-1 text-xs text-slate-500">
                                Manage announcement content and publication status.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            {searchInput}
                        </div>
                    </div>
                    )}

                    {/* Drafts/Schedule: fills the space left in the viewport and
                        is the only scroller. The feed scrolls with the page. */}
                    <div
                        className={
                            feedView
                                ? ''
                                : 'min-h-0 flex-1 overflow-auto overscroll-contain [scrollbar-width:thin]'
                        }
                    >
                    {filteredItems.length === 0 ? (
                        <div
                            className={`flex flex-col items-center justify-center px-6 py-10 text-center ${
                                feedView ? 'min-h-[50vh]' : 'h-full'
                            }`}
                        >
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                {currentView === 'drafts' ? (
                                    <Pencil size={25} />
                                ) : currentView === 'schedule' ? (
                                    <CalendarDays size={25} />
                                ) : (
                                    <Megaphone size={25} />
                                )}
                            </div>

                            <h3 className="mt-4 font-semibold text-slate-900">
                                {items.length === 0
                                    ? currentView === 'drafts'
                                        ? 'No drafts saved'
                                        : currentView === 'schedule'
                                        ? 'No scheduled announcements'
                                        : 'No published announcements'
                                    : 'No matching announcements'}
                            </h3>

                            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                                {currentView === 'drafts'
                                    ? 'Drafts you save will appear here so you can continue editing them.'
                                    : currentView === 'schedule'
                                    ? 'Announcements scheduled for future publication will appear here.'
                                    : 'Published announcements will appear here.'}
                            </p>

                            {currentView === 'announcements' && items.length === 0 && (
                                <button
                                    type="button"
                                    onClick={openCreate}
                                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    <Plus size={17} />
                                    Create announcement
                                </button>
                            )}
                        </div>
                    ) : currentView === 'announcements' ? (
                        // News-feed column: centered posts directly on the page.
                        <div className="px-1 pb-6 pt-1 sm:px-2">
                            <div className="mx-auto max-w-[37.5rem] space-y-4">
                                {filteredItems.map((announcement) => (
                                    <FeedPost
                                        key={announcement.announcement_id}
                                        announcement={announcement}
                                        onOpen={setViewingAnnouncement}
                                        onEdit={openEdit}
                                        onDelete={setDeletingAnnouncement}
                                    />
                                ))}

                                {/* End of feed: triggers loading the next posts. */}
                                <div
                                    ref={feedEndRef}
                                    className="flex items-center justify-center py-4 text-sm text-slate-500"
                                    role="status"
                                    aria-live="polite"
                                >
                                    {loadingMore ? (
                                        <span className="inline-flex items-center gap-2">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                                            Loading more announcements...
                                        </span>
                                    ) : feedHasMore ? (
                                        <span className="sr-only">Scroll for more announcements</span>
                                    ) : (
                                        "You're all caught up."
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : currentView === 'drafts' ? (
                        <div>
                            <table className="w-full min-w-[680px] text-left text-sm">
                                <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 font-semibold">Draft</th>
                                        <th className="px-5 py-4 font-semibold">Last created</th>
                                        <th className="px-5 py-4 font-semibold">Images</th>
                                        <th className="px-5 py-4 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredItems.map((announcement) => (
                                        <tr key={announcement.announcement_id} className="hover:bg-slate-50/70">
                                            <td className="px-5 py-4">
                                                <p className="font-semibold text-slate-900">
                                                    {announcement.title}
                                                </p>
                                                <p className="mt-1 max-w-sm truncate text-xs text-slate-500">
                                                    {announcement.description_content}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {formatDate(announcement.created_at)}
                                            </td>
                                            <td className="px-5 py-4 text-slate-600">
                                                {announcement.images?.length ?? 0}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(announcement)}
                                                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                                    >
                                                        <Pencil size={14} />
                                                        Edit
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => requestPublish(announcement)}
                                                        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                    >
                                                        Post Announcement
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setDeletingAnnouncement(announcement)}
                                                        aria-label={`Delete ${announcement.title}`}
                                                        className="rounded-lg border border-red-100 p-2 text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredItems.map((announcement) => (
                                <article
                                    key={announcement.announcement_id}
                                    className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6"
                                >
                                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                                        {announcement.images?.[0]?.image_path ? (
                                            <img
                                                src={imageUrl(announcement.images[0].image_path)}
                                                alt=""
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <CalendarDays size={23} />
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h3 className="break-words font-bold text-slate-900">
                                            {announcement.title}
                                        </h3>
                                        <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-slate-500">
                                            {announcement.description_content}
                                        </p>
                                        <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                                            <CalendarDays size={14} />
                                            Scheduled for {formatDateTime(announcement.scheduled_at)}
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => openEdit(announcement)}
                                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                        >
                                            <Pencil size={15} />
                                            Edit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingAnnouncement(announcement)}
                                            aria-label={`Delete ${announcement.title}`}
                                            className="rounded-xl border border-red-100 p-2 text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    </div>

                    {/* The feed loads more on scroll instead of paging. */}
                    {!feedView && (announcements?.links ?? []).length > 0 && (
                        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <p className="text-xs text-slate-500">
                                Showing {announcements.from ?? 0}–{announcements.to ?? 0} of{' '}
                                {announcements.total ?? 0} announcements
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {announcements.links.map((link, index) => (
                                    <button
                                        key={`${index}-${link.label}`}
                                        type="button"
                                        disabled={!link.url || link.active}
                                        onClick={() => link.url && router.visit(link.url, {
                                            preserveScroll: true,
                                        })}
                                        className={`min-w-9 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                                            link.active
                                                ? 'border-blue-600 bg-blue-600 text-white'
                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                        } disabled:cursor-not-allowed disabled:opacity-40`}
                                    >
                                        <span
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {(creating || editingAnnouncement) && (
                <AnnouncementFormModal
                    key={editingAnnouncement?.announcement_id ?? 'new-announcement'}
                    announcement={editingAnnouncement}
                    scheduleMode={currentView === 'schedule' && !editingAnnouncement}
                    onClose={closeForm}
                    onSaved={handleSaved}
                />
            )}

            {viewingAnnouncement && (
                <AnnouncementViewModal
                    key={viewingAnnouncement.announcement_id}
                    announcement={viewingAnnouncement}
                    onClose={() => setViewingAnnouncement(null)}
                    onEdit={(announcement) => {
                        setViewingAnnouncement(null);
                        openEdit(announcement);
                    }}
                    onDelete={(announcement) => {
                        setViewingAnnouncement(null);
                        setDeletingAnnouncement(announcement);
                    }}
                />
            )}

            <PublishConfirmation
                announcement={publishingAnnouncement}
                processing={publishProcessing}
                onCancel={() => setPublishingAnnouncement(null)}
                onConfirm={publishDraft}
            />

            <DeleteConfirmation
                announcement={deletingAnnouncement}
                processing={deleteProcessing}
                onCancel={() => setDeletingAnnouncement(null)}
                onConfirm={startDelete}
            />
        </AdminConnectLayout>
    );
}
