import { proofLabel, proofStyle } from '@/lib/eventDisplay';

export default function ProofStatusBadge({ status, hasPhoto, className = '' }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${proofStyle(
                status,
                hasPhoto,
            )} ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
            {proofLabel(status, hasPhoto)}
        </span>
    );
}
