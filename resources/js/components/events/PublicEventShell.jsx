import ApplicationLogo from '@/components/ApplicationLogo';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Link, usePage } from '@inertiajs/react';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PageSkeleton from '@/components/ui/PageSkeleton';
import usePendingPage from '@/lib/usePendingPage';

// Minimal frame for the public event pages, for guests and admins.
// Students and faculty get their dashboard layout (EventPageShell).
export default function PublicEventShell({ children }) {
    const pendingPage = usePendingPage();
    const page = usePage();
    const user = page.props.auth?.user;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    const home = user
        ? user.role === 'admin'
            ? route('admin.events.index')
            : user.role === 'faculty'
              ? route('faculty.events.index')
              : route('dashboard')
        : route('login');

    const links = [
        { label: 'Events', href: route('events.index'), primary: false },
        { label: user ? 'My dashboard' : 'Log in', href: home, primary: true },
    ];

    // Close on navigation, Escape, or a click outside the header.
    useEffect(() => setMenuOpen(false), [page.url]);

    useEffect(() => {
        if (!menuOpen) return undefined;

        const onKey = (event) => event.key === 'Escape' && setMenuOpen(false);
        const onClick = (event) => !menuRef.current?.contains(event.target) && setMenuOpen(false);

        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onClick);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClick);
        };
    }, [menuOpen]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header ref={menuRef} className="sticky top-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
                <div className="mx-auto flex h-16 max-w-6xl items-center justify-between rounded-2xl border border-white/70 bg-white/90 px-4 shadow-sm backdrop-blur-xl sm:px-5">
                    <Link href={route('events.index')} className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-blue-100">
                            <ApplicationLogo className="h-7 w-7 text-blue-700" />
                        </span>
                        <span className="min-w-0">
                            <span className="block text-[15px] font-extrabold tracking-tight text-blue-950">
                                CCS-CONNECT
                            </span>
                            <span className="block truncate text-[10px] font-medium text-blue-700/80">
                                College of Computing Studies
                            </span>
                        </span>
                    </Link>

                    <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-semibold sm:flex">
                        <ThemeToggle />
                        {links.map(({ label, href, primary }) => (
                            <Link
                                key={label}
                                href={href}
                                className={
                                    primary
                                        ? 'rounded-xl bg-blue-600 px-3.5 py-2 text-white transition hover:bg-blue-700'
                                        : 'rounded-xl px-3 py-2 text-slate-600 transition hover:bg-blue-50 hover:text-blue-700'
                                }
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>

                    <div className="flex items-center gap-1 sm:hidden">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setMenuOpen((open) => !open)}
                            aria-expanded={menuOpen}
                            aria-controls="public-mobile-menu"
                            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
                        >
                            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
                        </button>
                    </div>
                </div>

                {menuOpen && (
                    <nav
                        id="public-mobile-menu"
                        aria-label="Main"
                        className="mx-auto mt-2 max-w-6xl animate-fade-in rounded-2xl border border-slate-200 bg-white p-2 shadow-lg sm:hidden"
                    >
                        {links.map(({ label, href, primary }) => (
                            <Link
                                key={label}
                                href={href}
                                className={`block rounded-xl px-4 py-3 text-sm font-semibold transition ${
                                    primary
                                        ? 'mt-1 bg-blue-600 text-center text-white hover:bg-blue-700'
                                        : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                                }`}
                            >
                                {label}
                            </Link>
                        ))}
                    </nav>
                )}
            </header>

            <main className="mx-auto max-w-6xl px-4 pb-12 sm:px-6 lg:px-8">{pendingPage ? <PageSkeleton path={pendingPage} /> : children}</main>
        </div>
    );
}
