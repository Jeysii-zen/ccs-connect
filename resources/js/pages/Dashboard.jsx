import StudentDashboardLayout, { eventsHrefFor } from '@/layouts/StudentDashboardLayout';
import { Head, Link } from '@inertiajs/react';
import {
    BookOpen,
    CalendarCheck2,
    CalendarDays,
    CheckCircle2,
    ChevronRight,
    Clock3,
    GraduationCap,
    MapPin,
    MapPinned,
    Megaphone,
    Navigation,
    Sparkles,
    Users,
} from 'lucide-react';
import SectionHeading from '@/components/ui/SectionHeading';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';

const quickActions = [
    {
        label: 'Announcements',
        description: 'View latest updates',
        href: '#announcements',
        icon: Megaphone,
    },
    {
        label: 'Events',
        description: 'Explore CCS events',
        href: '#events',
        icon: CalendarCheck2,
    },
    {
        label: 'Campus Map',
        description: 'Find places around CCS',
        href: '#campus',
        icon: Navigation,
    },
];

function formatStatus(value) {
    return (value ?? 'unknown')
        .replaceAll('_', ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
        return 'Good morning,';
    }

    if (hour < 18) {
        return 'Good afternoon,';
    }

    return 'Good evening,';
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }).format(date);
}


export default function Dashboard({ user }) {
    const fullName =
        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();

    const quickActionItems = quickActions.map((item) =>
        item.label === 'Events' ? { ...item, href: eventsHrefFor(user) } : item,
    );

    const today = formatDate(new Date());
    const greeting = getGreeting();

    return (
        <StudentDashboardLayout active="Dashboard">
            <Head title="Student Dashboard" />

                            {/* Welcome */}
                            <section
                                className="ccs-page-in ccs-shimmer relative rounded-[30px] border border-white/70 bg-gradient-to-br from-[#a9d4f5] via-[#bfe0f8] to-[#9cc6ef] dark:from-[#0b2a4a] dark:via-[#0d2340] dark:to-[#0a1a33] dark:ring-blue-400/20 p-6 shadow-[0_25px_70px_rgba(30,80,160,0.28),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-blue-300/50 sm:p-8"
                                style={{ animationDelay: '80ms' }}
                            >
                                <div className="ccs-aurora pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/50 blur-3xl" />
                                <div className="ccs-aurora pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-blue-400/30 blur-3xl [animation-delay:-6s]" />
                                <div className="ccs-aurora pointer-events-none absolute left-1/2 top-1/3 h-48 w-48 rounded-full bg-cyan-300/25 blur-3xl [animation-delay:-10s]" />

                                <div
                                    className="pointer-events-none absolute inset-0 rounded-[30px] opacity-60"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(rgba(37,99,235,0.14) 1px, transparent 1px)',
                                        backgroundSize: '22px 22px',
                                        maskImage:
                                            'linear-gradient(to bottom, black, transparent 75%)',
                                        WebkitMaskImage:
                                            'linear-gradient(to bottom, black, transparent 75%)',
                                    }}
                                />
                                <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
                                <GraduationCap
                                    size={220}
                                    strokeWidth={1}
                                    className="pointer-events-none absolute -bottom-10 right-24 hidden rotate-[-12deg] text-blue-600/[0.06] xl:block"
                                />

                                {/* Circuit watermark (covers the whole panel) */}
                                <img
                                    src="/images/ccs-circuit.png"
                                    alt=""
                                    aria-hidden="true"
                                    draggable={false}
                                    className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover opacity-[0.16]"
                                />

                                <div className="relative z-10">
                                    <div className="flex flex-col justify-between gap-8 xl:flex-row xl:items-start">
                                        <div className="max-w-2xl">
                                            <p className="text-sm font-semibold text-blue-700">
                                                {greeting}
                                            </p>

                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                <h1 className="ccs-gradient-text text-3xl font-extrabold tracking-tight sm:text-4xl">
                                                    {fullName || 'Student'}
                                                </h1>

                                                <span className="ccs-float flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/10 text-blue-700">
                                                    <GraduationCap size={18} />
                                                </span>
                                            </div>

                                            <p className="mt-3 max-w-xl text-sm leading-6 text-blue-950/70 sm:text-base">
                                                Here&apos;s what&apos;s happening
                                                at CCS today. Stay informed,
                                                stay connected, and keep moving
                                                forward.
                                            </p>
                                        </div>

                                        <div className="shrink-0 rounded-2xl border border-white/80 bg-white/50 px-5 py-4 shadow-[0_10px_30px_rgba(30,80,160,0.14),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl">
                                            <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-blue-600">
                                                <span className="relative flex h-2 w-2">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                                </span>
                                                Today
                                            </p>

                                            <p className="mt-1 text-sm font-bold text-blue-950">
                                                {today}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Student info */}
                                    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                        <StatCard
                                            icon={BookOpen}
                                            label="Program"
                                            value="CCS"
                                            description="College of Computing Studies"
                                        />

                                        <StatCard
                                            icon={CalendarDays}
                                            label="Year Level"
                                            value={
                                                user.year_level ||
                                                'Not provided'
                                            }
                                            description="Current year level"
                                        />

                                        <StatCard
                                            icon={Users}
                                            label="Block"
                                            value={
                                                user.block_number ||
                                                'Not provided'
                                            }
                                            description="Block number"
                                        />

                                        <StatCard
                                            icon={CheckCircle2}
                                            label="Status"
                                            value={formatStatus(
                                                user.account_status,
                                            )}
                                            description="Current account status"
                                            status
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Main row */}
                            <section className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
                                {/* Schedule */}
                                <div
                                    className="ccs-page-in group rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                    style={{ animationDelay: '250ms' }}
                                >
                                    <SectionHeading
                                        icon={CalendarDays}
                                        title="Today's Schedule"
                                        subtitle={today}
                                    />

                                    <EmptyState
                                        icon={Clock3}
                                        title="No schedule items yet"
                                        description="Your class and event schedule will appear here once the scheduling module is connected."
                                    />
                                </div>

                                {/* Quick actions */}
                                <div
                                    className="ccs-page-in group rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                    style={{ animationDelay: '330ms' }}
                                >
                                    <SectionHeading
                                        icon={Sparkles}
                                        title="Quick Actions"
                                        subtitle="Useful shortcuts for your daily tasks."
                                    />

                                    <div className="mt-5 space-y-3">
                                        {quickActionItems.map(
                                            ({
                                                label,
                                                description,
                                                href,
                                                icon: Icon,
                                            }) => (
                                                <a
                                                    key={label}
                                                    href={href}
                                                    className="group/action flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-100/70 hover:shadow-md"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm transition duration-300 group-hover/action:scale-105 group-hover/action:rotate-2">
                                                            <Icon size={18} />
                                                        </div>

                                                        <div className="min-w-0">
                                                            <p className="truncate text-sm font-bold text-blue-950">
                                                                {label}
                                                            </p>

                                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                                {description}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <ChevronRight
                                                        size={17}
                                                        className="shrink-0 text-blue-500 transition duration-300 group-hover/action:translate-x-1"
                                                    />
                                                </a>
                                            ),
                                        )}
                                    </div>
                                </div>
                            </section>

                            {/* Announcements */}
                            <section
                                id="announcements"
                                className="ccs-page-in group mt-6 scroll-mt-28 rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                style={{ animationDelay: '410ms' }}
                            >
                                <SectionHeading
                                    icon={Megaphone}
                                    title="Recent Announcements"
                                    subtitle="Stay updated with CCS news and important notices."
                                />

                                <EmptyState
                                    icon={Megaphone}
                                    title="No announcements yet"
                                    description="New CCS announcements will appear here once the information dissemination module is available."
                                />
                            </section>

                            {/* Events + Campus */}
                            <section className="mt-6 grid gap-6 lg:grid-cols-2">
                                {/* Events */}
                                <div
                                    id="events"
                                    className="ccs-page-in group scroll-mt-28 rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                    style={{ animationDelay: '490ms' }}
                                >
                                    <SectionHeading
                                        icon={CalendarDays}
                                        title="Upcoming Events"
                                        subtitle="Discover upcoming CCS activities."
                                    />

                                    <EmptyState
                                        icon={CalendarDays}
                                        title="No upcoming events yet"
                                        description="Upcoming CCS events will be displayed here once the event management module is connected."
                                    />
                                </div>

                                {/* Campus */}
                                <div
                                    id="campus"
                                    className="ccs-page-in group scroll-mt-28 rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                    style={{ animationDelay: '570ms' }}
                                >
                                    <SectionHeading
                                        icon={MapPinned}
                                        title="Campus Navigation"
                                        subtitle="Find your way around CCS."
                                    />

                                    <div className="mt-5">
                                        <div className="relative h-[210px] overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-cyan-50 to-white">
                                            {/* Decorative buildings */}
                                            <div className="absolute left-7 top-7 h-16 w-28 rounded-xl bg-white/80 shadow-sm ring-1 ring-blue-100" />

                                            <div className="absolute right-8 top-5 h-20 w-32 rounded-xl bg-white/75 shadow-sm ring-1 ring-blue-100" />

                                            <div className="absolute bottom-8 left-[38%] h-16 w-36 rounded-xl bg-white/75 shadow-sm ring-1 ring-blue-100" />

                                            {/* Roads */}
                                            <div className="absolute left-0 right-0 top-[52%] h-[2px] rotate-6 bg-white/80" />

                                            <div className="absolute bottom-0 left-[48%] top-0 w-[2px] -rotate-[12deg] bg-white/80" />

                                            {/* Route */}
                                            <svg
                                                className="absolute inset-0 h-full w-full"
                                                viewBox="0 0 500 210"
                                                fill="none"
                                                aria-hidden="true"
                                            >
                                                <path
                                                    d="M55 165C120 135 115 100 180 105C245 110 252 58 320 64C383 70 386 116 450 46"
                                                    stroke="#1683ff"
                                                    strokeWidth="5"
                                                    strokeLinecap="round"
                                                    strokeDasharray="10 9"
                                                />
                                            </svg>

                                            {/* Start */}
                                            <div className="absolute bottom-7 left-5 flex items-center gap-2">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-white/70">
                                                    <Navigation size={16} />
                                                </span>

                                                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-emerald-700 shadow-sm">
                                                    Starting Point
                                                </span>
                                            </div>

                                            {/* Destination */}
                                            <div className="absolute right-5 top-7 flex flex-row-reverse items-center gap-2">
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg ring-4 ring-white/70">
                                                    <MapPin size={16} />
                                                </span>

                                                <span className="rounded-full bg-white/90 px-2.5 py-1 text-[9px] font-bold text-blue-700 shadow-sm">
                                                    Destination
                                                </span>
                                            </div>
                                        </div>

                                        <a
                                            href="#campus"
                                            className="group/map mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg"
                                        >
                                            Open Campus Map

                                            <ChevronRight
                                                size={15}
                                                className="transition duration-300 group-hover/map:translate-x-1"
                                            />
                                        </a>
                                    </div>
                                </div>
                            </section>

                            {/* My subjects */}
                            <section
                                className="ccs-page-in group mt-6 rounded-[28px] border border-white/90 bg-white/90 p-6 shadow-[0_14px_45px_rgba(15,82,140,0.06)] backdrop-blur transition-all duration-300 hover:shadow-[0_18px_50px_rgba(15,82,140,0.09)]"
                                style={{ animationDelay: '650ms' }}
                            >
                                <SectionHeading
                                    icon={BookOpen}
                                    title="My Subjects"
                                    subtitle="Your academic subjects will be shown here."
                                />

                                <div className="mt-5 rounded-2xl border border-dashed border-blue-200 bg-blue-50/40 px-5 py-8 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                                        <BookOpen size={21} />
                                    </div>

                                    <p className="mt-4 text-sm font-semibold text-blue-950">
                                        No subject data yet
                                    </p>

                                    <p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-500 sm:text-sm">
                                        Subject and class information can be
                                        connected here in a future academic
                                        module.
                                    </p>
                                </div>
                            </section>

                            {/* Bottom message */}
                            <section
                                className="ccs-page-in mt-6 rounded-[26px] border border-white/90 bg-gradient-to-r from-blue-50 via-white to-cyan-50 px-5 py-5 shadow-[0_14px_45px_rgba(15,82,140,0.05)]"
                                style={{ animationDelay: '730ms' }}
                            >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="ccs-float flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-700">
                                            <GraduationCap size={21} />
                                        </div>

                                        <div>
                                            <p className="text-sm font-bold text-blue-950">
                                                Keep up the great work!
                                            </p>

                                            <p className="mt-0.5 text-xs text-slate-500">
                                                Stay connected with CCS Connect
                                                and never miss an important
                                                update.
                                            </p>
                                        </div>
                                    </div>

                                    <Link
                                        href={route('profile.edit')}
                                        className="group/profile inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-blue-700 shadow-sm ring-1 ring-blue-100 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md"
                                    >
                                        Open My Profile

                                        <ChevronRight
                                            size={15}
                                            className="transition duration-300 group-hover/profile:translate-x-1"
                                        />
                                    </Link>
                                </div>
                            </section>
        </StudentDashboardLayout>
    );
}
