import { attendanceLabels, attendanceStyles } from '@/lib/eventDisplay';

export default function AttendanceStatusBadge({ status, className = '' }) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                attendanceStyles[status] ?? attendanceStyles.PENDING
            } ${className}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden="true" />
            {attendanceLabels[status] ?? status}
        </span>
    );
}
