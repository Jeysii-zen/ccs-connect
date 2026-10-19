import ApplicationLogo from '@/components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarDays,
    ChevronDown,
    Home,
    MapPin,
    Megaphone,
    Menu,
    PanelLeftClose,
    PanelLeftOpen,
    Search,
    Sparkles,
    UserRound,
    X,
} from 'lucide-react';
import { useState } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import PageSkeleton from '@/components/ui/PageSkeleton';
import usePendingPage from '@/lib/usePendingPage';

// Dashboard sections are anchors on the dashboard page; Events is a page.
const navigationItems = [
    { label: 'Dashboard', anchor: 'top', icon: Home },
    { label: 'Announcements', anchor: 'announcements', icon: Megaphone },
    { label: 'Events', anchor: 'events', icon: CalendarDays },
    { label: 'Campus Navigation', anchor: 'campus', icon: MapPin },
];

const roleLabels = {
    student: 'Student',
    faculty: 'Faculty',
};

function getInitials(user) {
    const first = user?.first_name?.[0] ?? '';
    const last = user?.last_name?.[0] ?? '';

    return `${first}${last}`.toUpperCase() || 'ST';
}

function getProfileImage(path) {
    if (!path) {
        return null;
    }

    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    if (path.startsWith('/')) {
        return path;
    }

    return `/storage/${path}`;
}

// Events links: faculty manage their events, students browse and register.
export function eventsHrefFor(user) {
    return user.role === 'faculty' ? route('faculty.events.index') : route('events.index');
}

/**
 * The student/faculty dashboard frame: background, collapsible sidebar and
 * top bar. Pages render their own content inside it; `active` names the
 * highlighted sidebar item.
 */
export default function StudentDashboardLayout({ active = 'Dashboard', children }) {
    const pendingPage = usePendingPage();
    const user = usePage().props.auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const fullName =
        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();

    const initials = getInitials(user);
    const profileImage = getProfileImage(user.profile_picture_path);

    // On the dashboard the sections are local anchors; elsewhere they lead
    // back to the dashboard section.
    const onDashboard = active === 'Dashboard';
    const navItems = navigationItems.map(({ anchor, ...item }) => ({
        ...item,
        href:
            item.label === 'Events'
                ? eventsHrefFor(user)
                : onDashboard
                  ? `#${anchor}`
                  : `${route('dashboard')}#${anchor}`,
    }));

    const closeMobileSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <>
            <style>{`
                @keyframes ccs-page-in {
                    from {
                        opacity: 0;
                        transform: translateY(22px) scale(0.97);
                        filter: blur(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                        filter: blur(0);
                    }
                }

                @keyframes ccs-aurora {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(40px, 24px) scale(1.15); }
                    66% { transform: translate(-30px, 36px) scale(0.92); }
                }

                @keyframes ccs-gradient-text {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 200% 50%; }
                }

                @keyframes ccs-ping {
                    0% { box-shadow: 0 0 0 0 rgba(239,68,68,0.55); }
                    70%, 100% { box-shadow: 0 0 0 9px rgba(239,68,68,0); }
                }

                @keyframes ccs-sidebar-in {
                    from {
                        opacity: 0;
                        transform: translateX(-12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }

                @keyframes ccs-float {
                    0%,
                    100% {
                        transform: translateY(0);
                    }
                    50% {
                        transform: translateY(-7px);
                    }
                }

                @keyframes ccs-shimmer {
                    0% {
                        transform: translateX(-130%);
                    }
                    55%,
                    100% {
                        transform: translateX(420%);
                    }
                }

                .ccs-page-in {
                    animation: ccs-page-in 0.75s cubic-bezier(.22,1,.36,1) backwards;
                }

                .ccs-page-in:nth-child(2) { animation-delay: 0.12s; }
                .ccs-page-in:nth-child(3) { animation-delay: 0.24s; }
                .ccs-page-in:nth-child(4) { animation-delay: 0.36s; }

                .ccs-page-in.group:hover {
                    transform: translateY(-4px);
                }

                .ccs-aurora {
                    animation: ccs-aurora 14s ease-in-out infinite;
                }

                .ccs-gradient-text {
                    background: linear-gradient(90deg, #172554, #2563eb, #0891b2, #172554);
                    background-size: 200% auto;
                    -webkit-background-clip: text;
                    background-clip: text;
                    color: transparent;
                    animation: ccs-gradient-text 6s linear infinite;
                }

                .ccs-ping {
                    animation: ccs-ping 2s ease-out infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    .ccs-aurora,
                    .ccs-gradient-text,
                    .ccs-ping {
                        animation: none !important;
                    }
                }

                .ccs-sidebar-in {
                    animation: ccs-sidebar-in 0.45s cubic-bezier(.22,1,.36,1) both;
                }

                .ccs-float {
                    animation: ccs-float 5s ease-in-out infinite;
                }

                .ccs-shimmer {
                    position: relative;
                    overflow: hidden;
                }

                .ccs-shimmer::after {
                    content: "";
                    position: absolute;
                    inset: 0;
                    width: 32%;
                    pointer-events: none;
                    background: linear-gradient(
                        90deg,
                        transparent,
                        rgba(255,255,255,0.35),
                        transparent
                    );
                    transform: translateX(-130%);
                    animation: ccs-shimmer 7s ease-in-out infinite;
                }

                @media (prefers-reduced-motion: reduce) {
                    .ccs-page-in,
                    .ccs-sidebar-in,
                    .ccs-float,
                    .ccs-shimmer::after {
                        animation: none !important;
                    }
                }
            `}</style>

            <div
                id="top"
                className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.13),_transparent_30%),linear-gradient(180deg,#f0f8ff_0%,#f7fbff_38%,#ffffff_100%)] text-slate-800"
            >

                {/* Background decoration */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-blue-200/20 blur-3xl" />

                    <div className="absolute -left-24 bottom-10 h-64 w-64 rounded-full bg-cyan-200/20 blur-3xl" />
                </div>

                {/* Mobile overlay */}
                <div
                    className={`fixed inset-0 z-40 bg-[#020618]/35 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
                        sidebarOpen
                            ? 'opacity-100'
                            : 'pointer-events-none opacity-0'
                    }`}
                    onClick={closeMobileSidebar}
                />

                {/* =========================
                    DESKTOP SIDEBAR
                ========================== */}
                <aside
                    style={{
                        width: sidebarCollapsed ? '76px' : '252px',
                    }}
                    className="fixed bottom-4 left-4 top-4 z-50 hidden flex-col rounded-[28px] border border-white/90 bg-white/90 px-3 py-5 shadow-[0_20px_60px_rgba(15,82,140,0.13)] backdrop-blur-2xl transition-[width] duration-500 ease-[cubic-bezier(.22,1,.36,1)] md:flex"
                >
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link
                            href="/"
                            className="group flex min-w-0 items-center gap-3"
                        >
                            <div className="ml-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100 transition duration-300 group-hover:scale-105">
                                <ApplicationLogo className="h-8 w-8 text-blue-700" />
                            </div>

                            <div
                                className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
                                    sidebarCollapsed
                                        ? 'max-w-0 -translate-x-2 opacity-0'
                                        : 'max-w-[160px] translate-x-0 opacity-100'
                                }`}
                            >
                                <p className="whitespace-nowrap text-[16px] font-extrabold tracking-tight text-blue-950">
                                    CCS-CONNECT
                                </p>

                                <p className="mt-0.5 whitespace-nowrap text-[9px] font-medium text-blue-700/80">
                                    College of Computing Studies
                                </p>
                            </div>
                        </Link>
                    </div>

                    {/* Collapse button */}
                    <button
                        type="button"
                        onClick={() =>
                            setSidebarCollapsed((value) => !value)
                        }
                        className="ml-1.5 mt-7 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors duration-200 hover:bg-blue-50 hover:text-blue-600"
                        aria-label={
                            sidebarCollapsed
                                ? 'Expand sidebar'
                                : 'Collapse sidebar'
                        }
                    >
                        {sidebarCollapsed ? (
                            <PanelLeftOpen
                                size={18}
                                strokeWidth={2}
                            />
                        ) : (
                            <PanelLeftClose
                                size={18}
                                strokeWidth={2}
                            />
                        )}
                    </button>

                    {/* Navigation */}
                    <nav className="mt-4 space-y-2">
                        {navItems.map(
                            ({ label, href, icon: Icon }, index) => (
                                <div
                                    key={label}
                                    className="ccs-sidebar-in group relative"
                                    style={{
                                        animationDelay: `${index * 70}ms`,
                                    }}
                                >
                                    <a
                                        href={href}
                                        onClick={closeMobileSidebar}
                                        className={`group relative flex h-12 items-center rounded-2xl transition-colors duration-200 ease-out ${
                                            label === active
                                                ? 'bg-blue-100 text-blue-700 shadow-sm'
                                                : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                        }`}
                                    >
                                        <span className="absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center">
                                            <Icon
                                                size={20}
                                                strokeWidth={2.1}
                                                className="text-blue-600 transition-transform duration-200 ease-out group-hover:scale-110"
                                            />
                                        </span>

                                        <span
                                            className={`ml-12 min-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-[max-width,opacity,transform] duration-300 ease-out ${
                                                sidebarCollapsed
                                                    ? 'pointer-events-none max-w-0 translate-x-[-6px] opacity-0'
                                                    : 'max-w-[180px] translate-x-0 opacity-100'
                                            }`}
                                        >
                                            {label}
                                        </span>

                                        {sidebarCollapsed && (
                                            <span className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 translate-x-[-5px] whitespace-nowrap rounded-xl bg-[#020618] px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
                                                {label}

                                                <span className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-slate-950" />
                                            </span>
                                        )}
                                    </a>
                                </div>
                            ),
                        )}
                    </nav>

                    {/* Sidebar bottom */}
                    <div
                        className={`mt-auto overflow-hidden transition-[max-height,opacity,transform] duration-400 ease-out ${
                            sidebarCollapsed
                                ? 'pointer-events-none max-h-0 translate-y-3 scale-95 opacity-0'
                                : 'max-h-[260px] translate-y-0 scale-100 opacity-100'
                        }`}
                    >
                        <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#b5d8f7] via-[#cbe6fa] to-[#e3f2fd] dark:from-[#0b2a4a] dark:via-[#0d2340] dark:to-[#0a1a33] dark:ring-blue-400/20 p-5 shadow-[0_4px_10px_rgba(30,80,160,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-blue-300/50">
                            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-300/30 blur-2xl" />
                            <img
                                src="/images/ccs-connect-logo.webp"
                                alt=""
                                aria-hidden="true"
                                draggable={false}
                                className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-[95%] w-auto max-w-none -translate-x-1/2 -translate-y-1/2 select-none object-contain opacity-[0.16]"
                            />
                            <Sparkles className="relative z-10 h-5 w-5 text-blue-600" />

                            <p className="relative mt-4 text-sm font-bold leading-5 text-blue-950">
                                Better Students.
                                <br />
                                A Brighter Future.
                            </p>

                            <p className="relative mt-2 text-xs leading-5 text-slate-700">
                                Stay connected with CCS activities,
                                announcements, and campus information.
                            </p>
                        </div>

                        <p className="mt-5 px-2 text-center text-[10px] font-normal text-slate-500/70">
                            College of Computing Studies
                        </p>
                    </div>
                </aside>

                {/* =========================
                    MOBILE SIDEBAR
                ========================== */}
                <aside
                    className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col bg-white px-4 py-5 shadow-2xl transition-transform duration-400 md:hidden ${
                        sidebarOpen
                            ? 'translate-x-0'
                            : '-translate-x-full'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
                                <ApplicationLogo className="h-8 w-8 text-blue-700" />
                            </div>

                            <div>
                                <p className="text-[16px] font-extrabold tracking-tight text-blue-950">
                                    CCS-CONNECT
                                </p>

                                <p className="text-[9px] font-medium text-blue-700/80">
                                    College of Computing Studies
                                </p>
                            </div>
                        </Link>

                        <button
                            type="button"
                            onClick={closeMobileSidebar}
                            className="rounded-xl p-2 text-slate-500 transition hover:bg-slate-100"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <nav className="mt-9 space-y-2">
                        {navItems.map(
                            ({ label, href, icon: Icon }, index) => (
                                <a
                                    key={label}
                                    href={href}
                                    onClick={closeMobileSidebar}
                                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                                        label === active
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-slate-700 hover:translate-x-1 hover:bg-blue-50 hover:text-blue-700'
                                    }`}
                                >
                                    <Icon
                                        size={20}
                                        className="text-blue-600"
                                    />

                                    {label}
                                </a>
                            ),
                        )}
                    </nav>

                    <div className="mt-auto rounded-[24px] bg-gradient-to-br from-blue-50 via-cyan-50 to-white p-5 ring-1 ring-blue-100/80">
                        <Sparkles className="h-5 w-5 text-blue-600" />

                        <p className="mt-4 text-sm font-bold leading-5 text-blue-950">
                            Better Students.
                            <br />
                            A Brighter Future.
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            Stay connected with CCS activities, announcements,
                            and campus information.
                        </p>
                    </div>
                </aside>

                {/* =========================
                    MAIN AREA
                ========================== */}
                <div
                    className={`transition-[margin-left] duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${
                        sidebarCollapsed
                            ? 'md:ml-[108px]'
                            : 'md:ml-[284px]'
                    }`}
                >
                    {/* Top Header */}
                    <header className="sticky top-0 z-30 bg-transparent">
                        <div className="mx-auto flex min-h-[72px] w-full max-w-[1480px] items-center gap-3 px-4 sm:px-6 lg:px-8">
                            {/* Mobile menu */}
                            <button
                                type="button"
                                onClick={() => setSidebarOpen(true)}
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm ring-1 ring-slate-200 transition duration-300 hover:scale-105 md:hidden"
                            >
                                <Menu size={20} />
                            </button>

                            {/* Search */}
                            <div className="group relative w-full max-w-[700px]">
                                <Search
                                    size={19}
                                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-blue-500 transition-colors duration-300 group-focus-within:text-blue-700"
                                />

                                <input
                                    type="search"
                                    placeholder="Search announcements, events, or locations..."
                                    className="h-12 w-full rounded-2xl border border-white/80 bg-white/60 pl-12 pr-16 text-sm text-slate-700 shadow-[0_8px_24px_rgba(30,80,160,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] outline-none backdrop-blur-xl transition-all duration-300 placeholder:text-slate-400 hover:bg-white/80 focus:border-blue-300 focus:bg-white focus:shadow-[0_12px_32px_rgba(37,99,235,0.18)] focus:ring-4 focus:ring-blue-200/50"
                                />

                            </div>

                            {/* Right controls */}
                            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                                <ThemeToggle className="h-11 w-11 rounded-2xl border border-white/80 bg-white/60 text-blue-700 backdrop-blur-xl" />
                                <button
                                    type="button"
                                    className="group relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/80 bg-white/60 text-blue-700 shadow-[0_8px_24px_rgba(30,80,160,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_28px_rgba(37,99,235,0.2)]"
                                    aria-label="Notifications"
                                >
                                    <Bell size={19} className="transition-transform duration-300 group-hover:rotate-12" />

                                    <span className="ccs-ping absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                                        3
                                    </span>
                                </button>

                                {/* Profile */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setProfileOpen((value) => !value)
                                        }
                                        className="flex items-center gap-2 rounded-2xl border border-white/80 bg-white/60 py-1.5 pl-1.5 pr-3 shadow-[0_8px_24px_rgba(30,80,160,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_28px_rgba(37,99,235,0.2)] sm:gap-3"
                                    >
                                        {profileImage ? (
                                            <img
                                                src={profileImage}
                                                alt={fullName || 'Student'}
                                                className="h-10 w-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-cyan-400 text-sm font-bold text-white ring-2 ring-white shadow-sm">
                                                {initials}
                                            </div>
                                        )}

                                        <div className="hidden min-w-0 text-left lg:block">
                                            <p className="max-w-[145px] truncate text-sm font-bold text-blue-950">
                                                {fullName || 'Student'}
                                            </p>

                                            <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                {roleLabels[user.role] ?? 'Student'}
                                            </p>
                                        </div>

                                        <ChevronDown
                                            size={16}
                                            className={`hidden text-blue-700 transition-transform duration-300 xl:block ${
                                                profileOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {profileOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-100 bg-white p-2 shadow-xl ring-1 ring-black/5">
                                            <Link
                                                href={route('profile.edit')}
                                                onClick={() =>
                                                    setProfileOpen(false)
                                                }
                                                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
                                            >
                                                <UserRound size={17} />
                                                My Profile
                                            </Link>

                                            <Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                onClick={() =>
                                                    setProfileOpen(false)
                                                }
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-red-50 hover:text-red-600"
                                            >
                                                <X size={17} />
                                                Log Out
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* =========================
                        PAGE CONTENT
                    ========================== */}
                    <main className="px-4 pb-7 pt-1 sm:px-6 lg:px-8 lg:pb-9">
                        <div className="mx-auto max-w-[1480px]">{pendingPage ? <PageSkeleton path={pendingPage} /> : children}</div>
                    </main>
                </div>
            </div>
        </>
    );
}
