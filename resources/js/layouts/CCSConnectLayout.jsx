import ApplicationLogo from '@/components/ApplicationLogo';
import { Link, usePage } from '@inertiajs/react';
import {
    Bell,
    CalendarDays,
    Home,
    MapPin,
    Megaphone,
    PanelLeftClose,
    PanelLeftOpen,
    Sparkles,
    X,
} from 'lucide-react';
import { useState } from 'react';

const navigationItems = [
    {
        label: 'Dashboard',
        href: route('dashboard'),
        icon: Home,
    },
    {
        label: 'Announcements',
        href: `${route('dashboard')}#announcements`,
        icon: Megaphone,
    },
    {
        label: 'Events',
        href: `${route('dashboard')}#events`,
        icon: CalendarDays,
    },
    {
        label: 'Campus Navigation',
        href: `${route('dashboard')}#campus`,
        icon: MapPin,
    },
];

export default function CCSConnectLayout({ children }) {
    const page = usePage();
    const user = page.props.auth.user;
    const currentUrl = page.url;

    const userName = `${user.first_name ?? ''} ${user.last_name ?? ''}`.trim();
    const userInitials =
        `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    const closeMobileSidebar = () => {
        setShowMobileSidebar(false);
    };
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-300 md:hidden ${
                    showMobileSidebar
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
                    {navigationItems.map(
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
                                        index === 0
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
                                        <span className="pointer-events-none absolute left-full top-1/2 z-[100] ml-3 -translate-y-1/2 translate-x-[-5px] whitespace-nowrap rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white opacity-0 shadow-xl transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100">
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
                    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#b5d8f7] via-[#cbe6fa] to-[#e3f2fd] p-5 shadow-[0_4px_10px_rgba(30,80,160,0.12),inset_0_1px_0_rgba(255,255,255,0.7)] ring-1 ring-blue-300/50">
                        <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-300/30 blur-2xl" />
                        <img
                            src="/images/ccs-connect-logo.png"
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
                    showMobileSidebar
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
                    {navigationItems.map(
                        ({ label, href, icon: Icon }, index) => (
                            <a
                                key={label}
                                href={href}
                                onClick={closeMobileSidebar}
                                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                                    index === 0
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



            {/* Main */}
            <div
                className={`min-h-screen transition-all duration-300 ${
                    sidebarCollapsed ? 'md:ml-[108px]' : 'md:ml-[284px]'
                }`}
            >
                {/* Top Header */}
                <header className="sticky top-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-5">
                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowMobileSidebar(true)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-700 md:hidden"
                                aria-label="Open navigation"
                            >
                                <PanelLeftOpen size={20} />
                            </button>

                            <div>
                                <p className="text-sm font-semibold text-slate-900">
                                    CCS Connect
                                </p>
                                <p className="hidden text-xs text-slate-400 sm:block">
                                    College of Computing Studies
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                                aria-label="Notifications"
                            >
                                <Bell size={19} />
                                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-600 ring-2 ring-white" />
                            </button>

                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowProfileMenu(
                                            (previous) => !previous,
                                        )
                                    }
                                    className="flex items-center gap-2 rounded-xl p-1.5 transition hover:bg-slate-50"
                                >
                                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-xs font-bold text-white">
                                        {userInitials}
                                    </div>

                                    <div className="hidden text-left sm:block">
                                        <p className="max-w-[150px] truncate text-sm font-semibold text-slate-800">
                                            {userName}
                                        </p>
                                        <p className="text-[11px] text-slate-400">
                                            Student
                                        </p>
                                    </div>
                                </button>

                                {showProfileMenu && (
                                    <>
                                        <button
                                            type="button"
                                            aria-label="Close profile menu"
                                            className="fixed inset-0 z-40 cursor-default"
                                            onClick={() =>
                                                setShowProfileMenu(false)
                                            }
                                        />

                                        <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl">
                                            <Link
                                                href={route('profile.edit')}
                                                className="block rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
                                                onClick={() =>
                                                    setShowProfileMenu(false)
                                                }
                                            >
                                                Profile
                                            </Link>

                                            <Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                className="block w-full rounded-xl px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                                                onClick={() =>
                                                    setShowProfileMenu(false)
                                                }
                                            >
                                                Log Out
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="px-4 pb-8 sm:px-6 lg:px-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
