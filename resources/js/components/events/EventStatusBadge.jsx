import { lifecycleDescriptions, lifecycleStyles } from '@/lib/eventDisplay';

export default function EventStatusBadge({ status, className = '' }) {
    return (
        <span
            title={lifecycleDescriptions[status]}
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                lifecycleStyles[status] ?? lifecycleStyles.Draft
            } ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
            {status}
        </span>
    );
}
