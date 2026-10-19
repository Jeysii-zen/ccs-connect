import ImageDropzone from '@/components/ui/ImageDropzone';
import { describeSubmission } from '@/lib/uploadProgress';
import { useForm } from '@inertiajs/react';
import { Upload } from 'lucide-react';
import { useState } from 'react';
import useObjectUrl from '@/lib/useObjectUrl';

// Mirrors StoreProofRequest; the server checks again.
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/**
 * Student proof upload (User Workflow: "Upload Selfie Showing Student +
 * Actual Event in Background → Submit Photo Proof").
 */
export default function ProofUploadForm({ registrationId, replacing = false }) {
    const form = useForm({ photo: null });
    const preview = useObjectUrl(form.data.photo);
    const [clientError, setClientError] = useState('');

    const choose = (file) => {
        if (!file) return;

        form.clearErrors();

        if (!PHOTO_TYPES.includes(file.type)) {
            setClientError('The proof photo must be a JPG, PNG or WEBP image.');
            return;
        }

        if (file.size > MAX_PHOTO_BYTES) {
            setClientError('The proof photo must not be larger than 15 MB.');
            return;
        }

        setClientError('');
        form.setData('photo', file);
    };

    const submit = (event) => {
        event.preventDefault();

        if (form.processing || !form.data.photo) return;

        form.post(route('student.registrations.proof.store', registrationId), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.reset(),
        });
    };

    const submission = describeSubmission(form.processing, form.progress);
    const error = clientError || form.errors.photo || form.errors.proof;

    return (
        <form onSubmit={submit} className="space-y-3">
            <ImageDropzone
                id={`proof-photo-${registrationId}`}
                accept={PHOTO_TYPES}
                disabled={form.processing}
                preview={preview}
                previewAlt="Selected proof photo"
                previewClassName="h-56"
                title="Drag and drop your proof photo here"
                hint="A selfie showing you with the event in the background · JPG, PNG or WEBP, up to 15 MB"
                invalid={Boolean(error)}
                describedBy={error ? `proof-photo-${registrationId}-error` : undefined}
                onFiles={([file]) => choose(file)}
            />

            {form.data.photo && (
                <p className="truncate text-xs text-slate-500">
                    Selected: <span className="font-medium text-slate-700">{form.data.photo.name}</span>
                </p>
            )}

            {error && (
                <p id={`proof-photo-${registrationId}-error`} role="alert" className="text-xs font-medium text-red-600">
                    {error}
                </p>
            )}

            {submission && (
                <div role="status" aria-live="polite">
                    <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-[width] duration-200"
                            style={{ width: `${submission.percentage ?? 100}%` }}
                        />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                        {submission.phase === 'processing' ? 'Saving...' : 'Uploading...'}
                    </p>
                </div>
            )}

            <button
                type="submit"
                disabled={form.processing || !form.data.photo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
            >
                <Upload size={16} />
                {form.processing ? 'Uploading...' : replacing ? 'Upload new photo' : 'Submit photo proof'}
            </button>
        </form>
    );
}
