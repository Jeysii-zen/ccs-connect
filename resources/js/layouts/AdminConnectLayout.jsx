import ApplicationLogo from '@/components/ApplicationLogo';
import { Link, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronDown,
    ChevronRight,
    Clock,
    GraduationCap,
    LayoutDashboard,
    List,
    LogOut,
    Maximize2,
    Megaphone,
    Menu,
    Minimize2,
    Navigation,
    Plus,
    Settings,
    ShieldCheck,
    UserPlus,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

// Returns '#' instead of crashing if a route name doesn't exist yet.
const r = (name, params) => (route().has(name) ? route(name, params) : '#');

const navigationItems = [
    {
        label: 'Dashboard',
        href: r('admin.dashboard'),
        match: '/admin/dashboard',
        icon: LayoutDashboard,
        actions: [
            { label: 'Overview', icon: LayoutDashboard, href: r('admin.dashboard') },
        ],
    },
    {
        label: 'Announcements',
        href: r('admin.announcements.index'),
        match: '/admin/announcements',
        icon: Megaphone,
        actions: [
            { label: 'All Announcements', icon: List, href: r('admin.announcements.index') },
            { label: 'Create Announcement', icon: Plus, href: r('admin.announcements.index', { create: 1 }) },
        ],
    },
    {
        label: 'Events',
        href: r('admin.events.index'),
        match: '/admin/events',
        icon: CalendarDays,
        actions: [
            { label: 'All Events', icon: List, href: r('admin.events.index') },
            { label: 'Create Event', icon: Plus, href: r('admin.events.index', { create: 1 }) },
        ],
    },
    {
        label: 'Account',
        href: route('admin.accounts.index'),
        match: '/admin/accounts',
        icon: Users,
        actions: [
            { label: 'Student Account', icon: GraduationCap, href: route('admin.accounts.index', { section: 'student' }) },
            { label: 'Faculty Account', icon: Users, href: route('admin.accounts.index', { section: 'faculty' }) },
            { label: 'Deactivated Account', icon: UserX, href: route('admin.accounts.index', { section: 'deactivated' }) },
        ],
    },
    {
        label: 'Navigation',
        href: r('admin.navigation.index'),
        match: '/admin/navigation',
        icon: Navigation,
        actions: [
            { label: 'All Links', icon: List, href: r('admin.navigation.index') },
            { label: 'Add Link', icon: Plus, href: r('admin.navigation.index', { create: 1 }) },
        ],
    },
    {
        label: 'Settings',
        href: r('admin.settings.index'),
        match: '/admin/settings',
        icon: Settings,
        actions: [
            { label: 'General', icon: Settings, href: r('admin.settings.index') },
            { label: 'Security', icon: ShieldCheck, href: r('admin.settings.index', { tab: 'security' }) },
        ],
    },
];

// Survives layout remounts (Inertia remounts the layout on every page visit).
const persisted = {
    shrunk: false,
    entered: false,
    section: null,
    startedAt: Date.now(),
    actionIndex: -1,
    actionSection: null,
};

// Sections that have a real page. Add a label here once its page is built.
const readyLabels = ['Account'];
const isReady = (item) => readyLabels.includes(item.label);
const skeletonSections = ['student', 'faculty', 'deactivated'];

// Mirrors the real Account tables (same column widths and cell shapes).
const skeletonColumns = {
    student: [
        { w: '22%', kind: 'name' },
        { w: '12%', kind: 'id' },
        { w: '10%', kind: 'text' },
        { w: '9%', kind: 'text' },
        { w: '9%', kind: 'badge' },
        { w: '11%', kind: 'status' },
        { w: '15%', kind: 'date' },
        { w: '12%', kind: 'actions' },
    ],
    faculty: [
        { w: '23%', kind: 'name' },
        { w: '13%', kind: 'id' },
        { w: '13%', kind: 'badge' },
        { w: '11%', kind: 'badge' },
        { w: '12%', kind: 'status' },
        { w: '16%', kind: 'date' },
        { w: '12%', kind: 'actions' },
    ],
    deactivated: [
        { w: '28%', kind: 'name' },
        { w: '14%', kind: 'id' },
        { w: '14%', kind: 'badge' },
        { w: '26%', kind: 'date' },
        { w: '18%', kind: 'button' },
    ],
};

const skeletonMinWidth = {
    student: '1100px',
    faculty: '1000px',
    deactivated: '900px',
};

const skeletonFilters = {
    student: [
        'w-full sm:w-64',
        'min-w-[9rem] flex-1 sm:w-40 sm:flex-none',
        'min-w-[7rem] flex-1 sm:w-28 sm:flex-none',
    ],
    faculty: ['w-full sm:w-64', 'min-w-[9rem] flex-1 sm:w-52 sm:flex-none'],
    deactivated: ['min-w-[9rem] flex-1 sm:w-36 sm:flex-none', 'w-full sm:w-64'],
};

function SkeletonCell({ kind }) {
    switch (kind) {
        case 'name':
            return <div className="h-4 w-4/5 rounded bg-slate-200" />;
        case 'id':
            return <div className="h-6 w-16 rounded-md bg-slate-100" />;
        case 'text':
            return <div className="h-4 w-12 rounded bg-slate-100" />;
        case 'badge':
            return <div className="h-6 w-16 rounded-full bg-slate-100" />;
        case 'status':
            return <div className="h-6 w-20 rounded-full bg-slate-100" />;
        case 'date':
            return <div className="h-4 w-24 rounded bg-slate-100" />;
        case 'actions':
            return (
                <div className="flex justify-end gap-2">
                    <div className="h-9 w-9 rounded-xl bg-slate-100" />
                    <div className="h-9 w-9 rounded-xl bg-slate-100" />
                </div>
            );
        case 'button':
            return <div className="ml-auto h-9 w-28 rounded-xl bg-slate-100" />;
        default:
            return null;
    }
}

function AdminPageSkeleton({ href }) {
    const requested = new URL(
        href ?? '/',
        window.location.origin,
    ).searchParams.get('section');
    const section = skeletonSections.includes(requested)
        ? requested
        : 'student';

    const columns = skeletonColumns[section];
    const template = columns.map((column) => column.w).join(' ');
    const isRight = (kind) => kind === 'actions' || kind === 'button';

    return (
        <div
            className="animate-pulse"
            aria-label="Loading content"
            role="status"
        >
            <div className="mx-auto max-w-7xl pb-2 pt-5 sm:pt-7">
                {/* Page header + Add Account button */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="h-9 w-72 max-w-full rounded-lg bg-slate-200 sm:h-10" />
                        <div className="mt-2 max-w-2xl">
                            <div className="flex h-6 items-center">
                                <div className="h-3.5 w-full rounded bg-slate-100" />
                            </div>
                            <div className="flex h-6 items-center">
                                <div className="h-3.5 w-2/3 rounded bg-slate-100" />
                            </div>
                        </div>
                    </div>

                    {section !== 'deactivated' && (
                        <div className="h-10 w-full shrink-0 rounded-xl bg-slate-200 sm:w-36" />
                    )}
                </div>

                {/* Table card (no bottom margin, same as the real card) */}
                <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)]">

                    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pb-4 pt-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-200" />
                            <div className="h-6 w-24 rounded-full bg-slate-100" />
                        </div>

                        <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap">
                            {skeletonFilters[section].map((classes, index) => (
                                <div
                                    key={index}
                                    className={`h-10 rounded-xl bg-slate-100 ${classes}`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="h-[22.75rem] overflow-hidden">
                        <div style={{ minWidth: skeletonMinWidth[section] }}>
                            <div
                                className="grid h-11 items-center bg-slate-50 shadow-[inset_0_-1px_0_#f1f5f9]"
                                style={{ gridTemplateColumns: template }}
                            >
                                {columns.map((column, index) => (
                                    <div key={index} className="px-5">
                                        <div
                                            className={`h-2.5 w-16 rounded bg-slate-200 ${
                                                isRight(column.kind)
                                                    ? 'ml-auto'
                                                    : ''
                                            }`}
                                        />
                                    </div>
                                ))}
                            </div>

                            {Array.from({ length: 5 }).map((_, row) => (
                                <div
                                    key={row}
                                    className="grid h-16 items-center border-b border-slate-100/80"
                                    style={{ gridTemplateColumns: template }}
                                >
                                    {columns.map((column, index) => (
                                        <div key={index} className="px-5">
                                            <SkeletonCell kind={column.kind} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <span className="sr-only">Loading page content...</span>
        </div>
    );
}

// Labels only fit on wide screens; below this the bar auto-shrinks to icons.
const WIDE_QUERY = '(min-width: 1440px)';
const useIsWide = () => {
    const [wide, setWide] = useState(() =>
        typeof window === 'undefined' ? true : window.matchMedia(WIDE_QUERY).matches,
    );

    useEffect(() => {
        const mq = window.matchMedia(WIDE_QUERY);
        const onChange = () => setWide(mq.matches);
        onChange();
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    return wide;
};

export default function AdminConnectLayout({ children }) {
    const page = usePage();
    const user = page.props.auth.user;
    const currentUrl = page.url;

    const [manualShrunk, setManualShrunk] = useState(persisted.shrunk);
    const isWide = useIsWide();
    const navShrunk = manualShrunk || !isWide;
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [selectedLabel, setSelectedLabel] = useState(null);
    const [pendingHref, setPendingHref] = useState(null);
    const [loading, setLoading] = useState(false);

    // Track page loads so the UI can react instantly while content loads.
    useEffect(() => {
        const offStart = router.on('start', (event) => {
            const visit = event.detail.visit;

            // Filters, pagination and tab switches keep the page mounted.
            if (visit.preserveState || visit.only?.length > 0) {
                return;
            }

            setLoading(true);
        });
        const offFinish = router.on('finish', () => {
            setLoading(false);
            setPendingHref(null);
        });

        return () => {
            offStart();
            offFinish();
        };
    }, []);

    const userName =
        `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim() ||
        'Administrator';

    const userInitials =
        `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() ||
        'A';

    const closeMobileSidebar = () => {
        setShowMobileSidebar(false);
    };

    const urlItem =
        navigationItems.find((item) => currentUrl.startsWith(item.match)) ??
        navigationItems.find(isReady) ??
        navigationItems[0];

    const activeItem =
        navigationItems.find((item) => item.label === selectedLabel) ??
        urlItem;

    const isActive = (item) => item.label === activeItem.label;

    useEffect(() => {
        setSelectedLabel(null);
    }, [currentUrl]);

    // Intro plays only on the very first mount; section animations only when the section changes.
    const [playIntro] = useState(() => !persisted.entered);
    const sectionChanged = persisted.section !== activeItem.label;
    const bgElapsed = (Date.now() - persisted.startedAt) / 1000;

    useEffect(() => {
        persisted.entered = true;

        // Runs once per browser document load, never on in-app navigation.
        if (persisted.reloadHandled) {
            return;
        }
        persisted.reloadHandled = true;

        const navigation = performance.getEntriesByType('navigation')[0];

        if (navigation?.type !== 'reload') {
            return;
        }

        const url = new URL(currentUrl, window.location.origin);
        const accountsPath = new URL(
            route('admin.accounts.index'),
            window.location.origin,
        ).pathname;

        // Hard reload on the Account page with any tab/filter/page in the URL:
        // go back to the default Student tab.
        if (
            url.pathname === accountsPath &&
            url.search !== '' &&
            url.search !== '?section=student'
        ) {
            router.get(
                route('admin.accounts.index', { section: 'student' }),
                {},
                { replace: true, preserveState: true, preserveScroll: true },
            );
        }
    }, []);

    useEffect(() => {
        persisted.section = activeItem.label;
    }, [activeItem.label]);

    useEffect(() => {
        persisted.shrunk = manualShrunk;
    }, [manualShrunk]);

    const stripOrigin = (href) => href.replace(/^https?:\/\/[^/]+/, '');

    const isActionActive = (href) => {
        const current = new URL(pendingHref ?? currentUrl, window.location.origin);
        const target = new URL(stripOrigin(href), window.location.origin);

        if (current.pathname !== target.pathname) {
            return false;
        }

        // Account page: match on ?section= only, defaulting to "student".
        // Search, filter and pagination params no longer affect the highlight.
        if (activeItem.label === 'Account') {
            const currentSection = current.searchParams.get('section') ?? 'student';
            const targetSection = target.searchParams.get('section') ?? 'student';

            return currentSection === targetSection;
        }

        return current.search === target.search;
    };

    const actions = isReady(activeItem) ? activeItem.actions : [];
    const activeIndex = actions.findIndex((a) => isActionActive(a.href));

    const [indicator, setIndicator] = useState(() => ({
        section: activeItem.label,
        index:
            persisted.actionSection === activeItem.label &&
            persisted.actionIndex >= 0
                ? persisted.actionIndex
                : activeIndex,
    }));

    useEffect(() => {
        const id = setTimeout(
            () =>
                setIndicator({ section: activeItem.label, index: activeIndex }),
            30,
        );
        persisted.actionIndex = activeIndex;
        persisted.actionSection = activeItem.label;
        return () => clearTimeout(id);
    }, [activeIndex, activeItem.label]);

    // Section changed: snap to the target row instead of gliding from the
    // previous section's row.
    const indicatorIndex =
        indicator.section === activeItem.label ? indicator.index : activeIndex;

    const sidebarContent = (
        <div className="relative flex h-[calc(100%-5rem)] flex-col overflow-y-auto px-4 py-5">
            {/* Section heading */}
            <div className="mb-3 flex items-center justify-between px-2">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
                    <activeItem.icon className="h-3.5 w-3.5" />
                    <span
                        key={activeItem.label}
                        className={`${sectionChanged ? 'ac-item-in' : ''} inline-block`}
                    >
                        {activeItem.label}
                    </span>
                </p>

                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-600 ring-1 ring-blue-100">
                    {isReady(activeItem) ? activeItem.actions.length : 0}
                </span>
            </div>

            {!isReady(activeItem) && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/60 p-4 text-center">
                    <p className="text-xs font-medium text-slate-400">
                        Actions will appear here once this section is ready.
                    </p>
                </div>
            )}

            {/* Actions */}
            <div key={activeItem.label} className="relative space-y-1.5">
                {indicatorIndex >= 0 && (
                    <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-0 top-0 h-[3.25rem] rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/25 transition-transform duration-300 ease-out"
                        style={{ transform: `translateY(${indicatorIndex * 3.625}rem)` }}
                    />
                )}

                {actions.map((action, index) => {
                    const ActionIcon = action.icon;
                    const active = isActionActive(action.href);

                    return (
                        <Link
                            key={action.label}
                            href={action.href}
                            onClick={() => {
                                closeMobileSidebar();
                                setPendingHref(stripOrigin(action.href));
                            }}
                            style={sectionChanged ? { animationDelay: `${index * 70}ms` } : undefined}
                            className={`${sectionChanged ? 'ac-item-in' : ''} group relative z-10 flex h-[3.25rem] items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-all duration-300 active:scale-[0.98] ${
                                active
                                    ? 'text-white'
                                    : 'text-slate-600 hover:translate-x-1 hover:bg-white hover:text-slate-900 hover:shadow-sm hover:ring-1 hover:ring-slate-200'
                            }`}
                        >
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-300 ${
                                    active
                                        ? 'bg-white/20 text-white'
                                        : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                                }`}
                            >
                                <ActionIcon className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                            </span>

                            <span className="flex-1 truncate">{action.label}</span>

                            <ChevronRight
                                className={`h-4 w-4 shrink-0 transition-all duration-300 ${
                                    active
                                        ? 'translate-x-0 opacity-80'
                                        : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'
                                }`}
                            />
                        </Link>
                    );
                })}
            </div>

            {/* Status card */}
            <div className="mt-auto">
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 p-4 text-white shadow-lg">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-400/25 blur-2xl" />

                    <div className="relative flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                            <ShieldCheck className="h-5 w-5 text-cyan-300" />
                        </div>

                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">
                                CCS Connect
                            </p>
                            <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-300">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                                </span>
                                All systems online
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const brand = (
        <Link
            href={route('admin.accounts.index')}
            onClick={closeMobileSidebar}
            className="group flex min-w-0 items-center gap-3"
        >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50 shadow-sm ring-1 ring-blue-100 transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
                <ApplicationLogo className="h-7 w-7" />
            </div>

            <div className="min-w-0">
                <p className="truncate bg-gradient-to-r from-slate-900 to-blue-700 bg-clip-text text-lg font-bold tracking-tight text-transparent">
                    CCS Connect
                </p>
                <p className="truncate text-xs font-medium text-slate-500">
                    Administrator Portal
                </p>
            </div>
        </Link>
    );

    return (
        <div className="relative isolate min-h-screen bg-slate-50 text-slate-900">
            <style>{`
                html{scrollbar-gutter:stable}
                @supports not (scrollbar-gutter:stable){html{overflow-y:scroll}}
                @keyframes acNavIn{from{opacity:0;top:-3.5rem}to{opacity:1;top:1rem}}
                @keyframes acSideIn{from{opacity:0;left:-16rem}to{opacity:1;left:0}}
                @keyframes acFadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
                @keyframes acSlideRight{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
                @keyframes acPop{from{opacity:0;transform:scale(.95) translateY(-6px)}to{opacity:1;transform:scale(1) translateY(0)}}
                @keyframes acFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
                @keyframes acBlob{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,30px) scale(1.15)}}
                .ac-nav-in{animation:acNavIn .6s cubic-bezier(.22,1,.36,1) backwards}
                .ac-profile-in{animation:acNavIn .6s .15s cubic-bezier(.22,1,.36,1) backwards}
                .ac-side-in{animation:acSideIn .6s cubic-bezier(.22,1,.36,1) backwards}
                .ac-content-in{animation:acFadeUp .7s cubic-bezier(.16,1,.3,1) backwards}
                .ac-item-in{animation:acSlideRight .35s ease-out backwards}
                .ac-pop{animation:acPop .2s ease-out backwards;transform-origin:top right}
                .ac-float{animation:acFloat 3.5s ease-in-out infinite}
                .ac-blob{animation:acBlob 14s ease-in-out infinite}
                @media (prefers-reduced-motion:reduce){
                    .ac-nav-in,.ac-profile-in,.ac-side-in,.ac-content-in,.ac-item-in,.ac-pop,.ac-float,.ac-blob{animation:none}
                }
            `}</style>

            {/* Soft animated background glow */}
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
                <div
                    style={{
                        animationDelay: `-${bgElapsed}s`,
                        background:
                            'radial-gradient(circle, rgba(96,165,250,.28) 0%, transparent 70%)',
                    }}
                    className="ac-blob absolute -left-40 top-1/4 h-[32rem] w-[32rem] rounded-full"
                />
                <div
                    style={{
                        animationDelay: `-${bgElapsed + 7}s`,
                        background:
                            'radial-gradient(circle, rgba(103,232,249,.28) 0%, transparent 70%)',
                    }}
                    className="ac-blob absolute -right-40 bottom-0 h-[36rem] w-[36rem] rounded-full"
                />
            </div>
            {/* ===== Shrinkable Navigation Bar ===== */}
            <nav
                className={`${playIntro ? 'ac-nav-in' : ''} fixed left-1/2 top-4 z-40 flex w-max max-w-[calc(100vw-9.5rem)] overflow-x-auto [scrollbar-width:none] sm:max-w-none sm:overflow-visible -translate-x-1/2 items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 shadow-lg backdrop-blur transition-all duration-300 ease-in-out ${
                    navShrunk ? 'p-1.5' : 'px-4 py-3'
                }`}
            >

                {/* Nav links */}
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);

                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            onClick={(e) => {
                                setSelectedLabel(item.label);
                                if (!isReady(item)) {
                                    e.preventDefault();
                                    return;
                                }
                                // Highlight the destination right away,
                                // not the page we're leaving.
                                setPendingHref(stripOrigin(item.href));
                            }}
                            title={navShrunk ? item.label : undefined}
                            className={`group flex shrink-0 items-center rounded-xl transition-all duration-300 ease-in-out hover:-translate-y-0.5 active:scale-95 ${
                                navShrunk ? 'p-2.5' : 'px-4 py-3'
                            } ${
                                active
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                        >
                            <Icon className="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:scale-110" />
                            <div
                                className={`grid transition-[grid-template-columns,opacity] duration-300 ease-in-out ${
                                    navShrunk
                                        ? 'grid-cols-[0fr] opacity-0'
                                        : 'grid-cols-[1fr] opacity-100'
                                }`}
                            >
                                <div className="min-w-0 overflow-hidden">
                                    <span className="block whitespace-nowrap pl-3 text-sm font-semibold">
                                        {item.label}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    );
                })}

                <div className="mx-1 hidden h-6 w-px bg-slate-200 min-[1440px]:block" />

                {/* Shrink toggle */}
                <button
                    type="button"
                    onClick={() => setManualShrunk((current) => !current)}
                    className="hidden rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 min-[1440px]:block"
                    aria-label={navShrunk ? 'Expand navigation' : 'Shrink navigation'}
                    title={navShrunk ? 'Expand' : 'Shrink'}
                >
                    {navShrunk ? (
                        <Maximize2 className="h-4 w-4" />
                    ) : (
                        <Minimize2 className="h-4 w-4" />
                    )}
                </button>
            </nav>

            {/* ===== Fixed Profile Box (upper right) ===== */}
            <div className={`${playIntro ? 'ac-profile-in' : ''} fixed right-4 top-4 z-50`}>
                <button
                    type="button"
                    onClick={() => setShowProfileMenu((current) => !current)}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur transition hover:bg-slate-50"
                >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                        {userInitials}
                    </div>

                    <div className="hidden text-left md:block">
                        <p className="max-w-40 truncate text-sm font-semibold text-slate-900">
                            {userName}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                            Administrator
                        </p>
                    </div>

                    <ChevronDown
    className={`hidden h-4 w-4 text-slate-400 transition-transform duration-300 md:block ${
        showProfileMenu ? 'rotate-180' : ''
    }`}
/>
                </button>

                {showProfileMenu && (
                    <div className="ac-pop absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                        <div className="border-b border-slate-100 px-3 py-3">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {userName}
                            </p>
                            <p className="mt-1 truncate text-xs text-slate-500">
                                {user.email}
                            </p>
                        </div>

                        <div className="mt-2">
                            <Link
                                href={route('profile.edit')}
                                className="flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                Profile
                            </Link>

                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                                onClick={() => setShowProfileMenu(false)}
                            >
                                <LogOut className="h-4 w-4" />
                                Log Out
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            {/* ===== Actions Sidebar (desktop) ===== */}
            <aside className={`${playIntro ? 'ac-side-in' : ''} fixed inset-y-0 left-0 z-30 hidden w-64 overflow-hidden rounded-r-[2rem] border-y border-r border-slate-200/70 bg-gradient-to-b from-white via-white to-blue-50/50 shadow-[4px_0_24px_-12px_rgba(15,23,42,0.15)] lg:block`}>
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-blue-400/15 blur-3xl" aria-hidden="true" />

                <div className="relative flex h-20 items-center border-b border-slate-200/70 px-4">
                    {brand}
                </div>
                {sidebarContent}
            </aside>

            {/* ===== Actions Sidebar (mobile drawer) ===== */}
            <button
                type="button"
                onClick={() => setShowMobileSidebar(true)}
                className="fixed left-4 top-4 z-40 rounded-xl border border-slate-200 bg-white/95 p-2.5 text-slate-600 shadow-lg lg:hidden"
                aria-label="Open actions"
            >
                <Menu className="h-5 w-5" />
            </button>

            {showMobileSidebar && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
                    onClick={closeMobileSidebar}
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] overflow-hidden rounded-r-[2rem] border-y border-r border-slate-200/70 bg-gradient-to-b from-white via-white to-blue-50/60 shadow-2xl transition-transform duration-300 lg:hidden ${
                    showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex h-20 items-center justify-between gap-2 border-b border-slate-200 px-4">
                    {brand}

                    <button
                        type="button"
                        onClick={closeMobileSidebar}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Close actions"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {sidebarContent}
            </aside>

            {/* ===== Page Content ===== */}
            <div className="min-h-screen min-w-0 px-4 pb-8 pt-24 sm:px-6 lg:ml-64 lg:px-8">
                <main
                    key={activeItem.label}
                    aria-busy={loading}
                    className={`${sectionChanged ? 'ac-content-in' : ''} transition-opacity duration-300`}
                >
                    {loading ? (
                        <AdminPageSkeleton href={pendingHref ?? currentUrl} />
                    ) : isReady(activeItem) ? (
                        children
                    ) : (
                        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6">
                            <div className="w-full max-w-md rounded-3xl border-2 border-dashed border-slate-300 bg-white/60 p-10 text-center">
                                <div className="ac-float mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                                    <activeItem.icon className="h-7 w-7" />
                                </div>

                                <span className="mt-5 inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                    <span className="mr-1.5 h-1.5 w-1.5 shrink-0 animate-pulse self-center rounded-full bg-amber-500" />
                                    Under Development
                                </span>

                                <h2 className="mt-3 text-xl font-bold text-slate-900">
                                    {activeItem.label}
                                </h2>

                                <p className="mt-2 text-sm text-slate-500">
                                    This section is currently being worked on.
                                    Its content will appear here once it's ready.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}