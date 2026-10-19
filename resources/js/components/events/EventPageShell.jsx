import PublicEventShell from '@/components/events/PublicEventShell';
import StudentDashboardLayout from '@/layouts/StudentDashboardLayout';
import { Link, usePage } from '@inertiajs/react';

function StudentEventTabs() {
    const url = usePage().url;

    const tabs = [
        { label: 'Upcoming events', href: route('events.index'), active: url.startsWith('/events') },
        { label: 'My events', href: route('student.registrations.index'), active: url.startsWith('/my-events') },
    ];

    return (
        <nav aria-label="Events" className="mb-2 flex gap-1 pt-2">
            {tabs.map(({ label, href, active }) => (
                <Link
                    key={label}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
                        active
                            ? 'bg-white text-blue-700 shadow-sm ring-1 ring-blue-100'
                            : 'text-slate-500 hover:bg-white/70 hover:text-blue-700'
                    }`}
                >
                    {label}
                </Link>
            ))}
        </nav>
    );
}

/**
 * Frame for the event pages. Signed-in students and faculty keep their
 * dashboard layout (sidebar and top bar) with Events highlighted; guests
 * and other roles get the public header.
 */
export default function EventPageShell({ tabs = false, children }) {
    const user = usePage().props.auth?.user;

    if (user && ['student', 'faculty'].includes(user.role)) {
        return (
            <StudentDashboardLayout active="Events">
                {tabs && user.role === 'student' && <StudentEventTabs />}
                {children}
            </StudentDashboardLayout>
        );
    }

    return <PublicEventShell>{children}</PublicEventShell>;
}
