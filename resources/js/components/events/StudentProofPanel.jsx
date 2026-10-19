import ProofStatusBadge from '@/components/events/ProofStatusBadge';
import ProofUploadForm from '@/components/events/ProofUploadForm';
import { formatDateTime } from '@/lib/eventDisplay';
import { AlertCircle, ExternalLink } from 'lucide-react';

/**
 * A student's proof-photo status for one registration, with the upload
 * form while the event's window is open and a new photo is allowed.
 */
export default function StudentProofPanel({ event, registration }) {
    if (registration.proof_status === 'NOT_REQUIRED') {
        return <p className="text-sm text-slate-600">No proof photo is needed for this event.</p>;
    }

    const windowText = `${formatDateTime(event.proof_upload_start_at)} to ${formatDateTime(event.proof_upload_end_at)}`;
    const status = registration.proof_status;

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
                <ProofStatusBadge status={status} hasPhoto={registration.has_proof_photo} />
                {registration.proof_uploaded_at && (
                    <span className="text-xs text-slate-500">
                        Uploaded {formatDateTime(registration.proof_uploaded_at)}
                    </span>
                )}
            </div>

            {status === 'REJECTED' && registration.proof_rejection_reason && (
                <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <p>
                        <span className="font-semibold">Reason: </span>
                        {registration.proof_rejection_reason}
                    </p>
                </div>
            )}

            <p className="text-xs text-slate-500">
                {
                    {
                        upcoming: `Uploads open ${windowText}. Photo upload is unavailable until then.`,
                        open: `Uploads are open from ${windowText}.`,
                        closed: `The upload window (${windowText}) has closed.`,
                    }[registration.proof_window]
                }
                {status === 'APPROVED' && ' Your photo has been approved.'}
                {status === 'PENDING' && registration.has_proof_photo && ' A reviewer will check your photo.'}
                {status === 'EXPIRED' && ' No approved photo was submitted in time.'}
            </p>

            {registration.proof_url && (
                <a
                    href={registration.proof_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                >
                    <ExternalLink size={13} />
                    View my uploaded photo
                </a>
            )}

            {registration.can_upload_proof && (
                <ProofUploadForm
                    registrationId={registration.registration_id}
                    replacing={registration.has_proof_photo}
                />
            )}
        </div>
    );
}
