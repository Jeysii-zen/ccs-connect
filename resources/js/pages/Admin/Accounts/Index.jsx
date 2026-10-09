import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Copy,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Pencil,
    RotateCcw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
const labelClass = 'text-sm font-semibold text-slate-700';
function FieldError({ message }) {
    if (!message) {
        return null;
    }
    return (
        <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
    );
}
function FormField({
    label,
    name,
    id,
    value,
    onChange,
    error,
    type = 'text',
    placeholder,
    required = false,
}) {
    const fieldId = id ?? name;
    return (
        <div>
            <label htmlFor={fieldId} className={labelClass}>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            <input
                id={fieldId}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`${inputClass} ${
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : ''
                }`}
            />
            <FieldError message={error} />
        </div>
    );
}
function SelectField({
    label,
    name,
    id,
    value,
    onChange,
    error,
    options,
    placeholder,
    required = false,
}) {
    const fieldId = id ?? name;
    return (
        <div>
            <label htmlFor={fieldId} className={labelClass}>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>
            <select
                id={fieldId}
                name={name}
                value={value}
                onChange={onChange}
                className={`${inputClass} ${
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : ''
                }`}
            >
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            <FieldError message={error} />
        </div>
    );
}
function formatFullName(user) {
    const firstName = user.first_name?.trim() ?? '';
    const middleInitial = user.middle_name?.trim()
        ? ` ${user.middle_name.trim().charAt(0).toUpperCase()}.`
        : '';
    const lastName = user.last_name?.trim() ?? '';
    const suffix = user.suffix?.trim() ? ` ${user.suffix.trim()}` : '';

    return `${firstName}${middleInitial} ${lastName}${suffix}`.trim();
}

function getPresenceStatus(lastSeenAt) {
    if (!lastSeenAt) {
        return 'Offline';
    }

    const lastSeen = new Date(lastSeenAt);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    return lastSeen.getTime() >= fiveMinutesAgo ? 'Online' : 'Offline';
}

function formatLastLogin(lastLoginAt) {
    if (!lastLoginAt) {
        return 'Never';
    }

    return new Date(lastLoginAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

/* ------------------------------------------------------------------ */
/*  Motion + shared UI for the Account Management content area          */
/* ------------------------------------------------------------------ */

function AccountsMotionStyles() {
    return (
        <style>{`
            @keyframes axRise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
            @keyframes axRow{from{opacity:0;transform:translateX(-12px)}to{opacity:1;transform:none}}
            @keyframes axBar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
            @keyframes axSheen{0%{background-position:200% 0}100%{background-position:-200% 0}}
            @keyframes axFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
            @keyframes axRing{0%{transform:scale(.8);opacity:.4}100%{transform:scale(1.6);opacity:0}}
            @keyframes axPop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}

            .ax-card{animation:axRise .6s cubic-bezier(.16,1,.3,1) backwards}
            .ax-bar{transform-origin:left;animation:axBar 1s .1s cubic-bezier(.16,1,.3,1) backwards}
            .ax-row{animation:axRow .5s cubic-bezier(.16,1,.3,1) backwards}
            .ax-row td:first-child{transition:box-shadow .25s ease}
            .ax-row:hover td:first-child{box-shadow:inset 3px 0 0 var(--ax-accent,#2563eb)}
            .ax-float{animation:axFloat 3.2s ease-in-out infinite}
            .ax-ring{animation:axRing 3s ease-out infinite}
            @keyframes axFade{from{opacity:0}to{opacity:1}}
            .ax-pop{animation:axPop .35s cubic-bezier(.34,1.56,.64,1) backwards}
            .ax-fade{animation:axFade .2s ease-out backwards}

            .ax-add svg,.ax-react svg{transition:transform .5s cubic-bezier(.16,1,.3,1)}
            .ax-add:hover svg{transform:scale(1.2) rotate(-8deg)}
            .ax-react:hover svg{transform:rotate(-360deg)}

            @media (prefers-reduced-motion:reduce){
                .ax-card,.ax-bar,.ax-sheen,.ax-row,.ax-float,.ax-ring,.ax-pop{animation:none}
                .ax-add svg,.ax-react svg{transition:none}
            }
        `}</style>
    );
}

const accountTabs = [
    { key: 'student', label: 'Student', icon: GraduationCap },
    { key: 'faculty', label: 'Faculty', icon: Users },
    { key: 'deactivated', label: 'Deactivated', icon: RotateCcw },
];

function AccountTabs({ activeSection, action }) {
    const activeIndex = Math.max(
        0,
        accountTabs.findIndex((tab) => tab.key === activeSection),
    );

    return (
        <>
            <AccountsMotionStyles />

            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div
                    role="tablist"
                    className="relative grid w-full grid-cols-3 rounded-2xl border border-slate-200/80 bg-white p-1.5 shadow-sm sm:w-[30rem]"
                >
                    {/* Sliding active pill */}
                    <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-1.5 left-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-600/25"
                        style={{
                            width: 'calc((100% - 0.75rem) / 3)',
                            transform: `translateX(${activeIndex * 100}%)`,
                            transition:
                                'transform .5s cubic-bezier(.34,1.3,.64,1)',
                        }}
                    />

                    {accountTabs.map((tab) => {
                        const isActive = activeSection === tab.key;
                        const Icon = tab.icon;

                        return (
                            <button
                                key={tab.key}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                onClick={() =>
                                    router.get(
                                        route('admin.accounts.index'),
                                        { section: tab.key },
                                        {
                                            preserveState: true,
                                            preserveScroll: true,
                                            replace: true,
                                        },
                                    )
                                }
                                className={`relative z-10 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors duration-300 ${
                                    isActive
                                        ? 'text-white'
                                        : 'text-slate-600 hover:text-slate-900'
                                }`}
                            >
                                <Icon
                                    size={15}
                                    className={`transition-transform duration-300 ${
                                        isActive ? 'scale-110' : 'scale-100'
                                    }`}
                                />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Add Account button, outside the table card */}
                {action}
            </div>
        </>
    );
}

const toolbarFieldClass =
    'h-10 rounded-xl border border-slate-200 bg-white/90 text-sm text-slate-700 outline-none transition-all duration-300 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100';

const iconBtnBase =
    'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-90';
const editBtnClass = `${iconBtnBase} hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600`;
const dangerBtnClass = `${iconBtnBase} hover:border-red-200 hover:bg-red-50 hover:text-red-600`;

const rowDelay = (index) => ({
    animationDelay: `${Math.min(index, 10) * 45}ms`,
});

function SearchBox({ id, value, onChange, placeholder }) {
    return (
        <div className="group relative w-full min-w-0 sm:w-64">
            <Search
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-300 group-focus-within:text-blue-600"
            />
            <input
                id={id}
                type="search"
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`${toolbarFieldClass} w-full pl-10 pr-3`}
            />
        </div>
    );
}

function FilterSelect({ label, value, onChange, children }) {
    return (
        <div className="group relative min-w-[9rem] flex-1 sm:flex-none">
            <select
                aria-label={label}
                value={value}
                onChange={onChange}
                className={`${toolbarFieldClass} w-full cursor-pointer appearance-none pl-3.5 pr-9 sm:w-auto`}
            >
                {children}
            </select>
            <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-all duration-300 group-focus-within:rotate-180 group-focus-within:text-blue-600"
            />
        </div>
    );
}

function AddAccountButton({ onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="ax-add inline-flex h-10 w-full shrink-0 sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-blue-600/30 focus:outline-none focus:ring-4 focus:ring-blue-200 active:translate-y-0 active:scale-95"
        >
            <UserPlus size={16} />
            Add Account
        </button>
    );
}

function NameCell({ user }) {
    return (
        <span className="font-semibold text-slate-800">
            {formatFullName(user)}
        </span>
    );
}

const panelTones = {
    blue: {
        tile: 'from-blue-500 to-indigo-500 shadow-blue-500/30',
        ring: 'bg-blue-400',
        chip: 'bg-blue-50 text-blue-700 ring-blue-100',
        bar: 'from-blue-500 via-cyan-400 to-blue-500',
    },
    cyan: {
        tile: 'from-cyan-500 to-blue-500 shadow-cyan-500/30',
        ring: 'bg-cyan-400',
        chip: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
        bar: 'from-cyan-500 via-blue-400 to-cyan-500',
    },
    slate: {
        tile: 'from-slate-500 to-slate-700 shadow-slate-500/30',
        ring: 'bg-slate-400',
        chip: 'bg-slate-100 text-slate-600 ring-slate-200',
        bar: 'from-slate-400 via-emerald-400 to-slate-400',
    },
};

function AccountPanel({ icon: Icon, tone = 'blue', count, toolbar, children }) {
    const t = panelTones[tone];

    return (
        <section className="ax-card relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_10px_40px_-18px_rgba(15,23,42,0.18)]">

            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 pb-4 pt-5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${t.tile}`}
                    >
                        <Icon size={17} />
                    </div>

                    {typeof count === 'number' && (
                        <span
                            key={count}
                            className={`ax-pop rounded-full px-3 py-1 text-xs font-semibold tabular-nums ring-1 ${t.chip}`}
                        >
                            {count} {count === 1 ? 'account' : 'accounts'}
                        </span>
                    )}
                </div>

                {toolbar}
            </div>

            {children}
        </section>
    );
}

function AccountTable({ headers, minWidth = 'min-w-[900px]', children }) {
    return (
        <div className="h-[22.75rem] overflow-auto overscroll-contain [scrollbar-width:thin]">
            <table
                className={`w-full table-fixed ${minWidth} text-left [&_tbody_tr]:h-16 [&_td]:break-words [&_td]:px-5 [&_th]:h-11 [&_th]:px-5`}
            >
                <colgroup>
                    {headers.map((header) => (
                        <col
                            key={header.label}
                            style={
                                header.width
                                    ? { width: header.width }
                                    : undefined
                            }
                        />
                    ))}
                </colgroup>

                <thead className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                        {headers.map((header) => (
                            <th
                                key={header.label}
                                className={`sticky top-0 z-10 bg-slate-50 py-3.5 shadow-[inset_0_-1px_0_#f1f5f9] ${
                                    header.right ? 'text-right' : ''
                                }`}
                            >
                                {header.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                    {children}
                </tbody>
            </table>
        </div>
    );
}

function StatusBadge({ lastSeenAt }) {
    const status = getPresenceStatus(lastSeenAt);
    const isOnline = status === 'Online';

    return (
        <span
            className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 transition-colors ${
                isOnline
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
                    : 'bg-slate-100 text-slate-500 ring-slate-200'
            }`}
        >
            <span className="relative flex h-2 w-2">
                {isOnline && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                        isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                />
            </span>
            {status}
        </span>
    );
}

function EmptyTableState() {
    return (
        <div className="flex h-[20rem] flex-col items-center justify-center text-center">
            <div className="relative h-14 w-14">
                <span className="ax-ring absolute inset-0 rounded-2xl bg-blue-300/60" />
                <div className="ax-float relative flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-100 text-slate-400 shadow-sm">
                    <Users size={22} />
                </div>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-600">
                No accounts found
            </p>
        </div>
    );
}

function Pagination({ paginator, onPageChange }) {
    if (!paginator || paginator.last_page <= 1) {
        return null;
    }

    const navBtn =
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 active:scale-90 disabled:pointer-events-none disabled:opacity-40';

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Showing{' '}
                <span className="font-semibold text-slate-700">
                    {paginator.from}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700">
                    {paginator.to}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700">
                    {paginator.total}
                </span>{' '}
                accounts
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    disabled={!paginator.prev_page_url}
                    onClick={() =>
                        paginator.prev_page_url &&
                        onPageChange(paginator.current_page - 1)
                    }
                    className={navBtn}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {paginator.links
                    .filter(
                        (link) =>
                            link.page !== null &&
                            !link.label.includes('Previous') &&
                            !link.label.includes('Next'),
                    )
                    .map((link) => (
                        <button
                            key={link.page}
                            type="button"
                            onClick={() => onPageChange(link.page)}
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold transition-all duration-200 active:scale-90 ${
                                link.active
                                    ? 'bg-gradient-to-br from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-600/25'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                            }`}
                        >
                            {link.page}
                        </button>
                    ))}

                <button
                    type="button"
                    disabled={!paginator.next_page_url}
                    onClick={() =>
                        paginator.next_page_url &&
                        onPageChange(paginator.current_page + 1)
                    }
                    className={navBtn}
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}
function useDebouncedFilters(values, onChange, delay = 400) {
    const lastKey = useRef(JSON.stringify(values));
    const callback = useRef(onChange);
    callback.current = onChange;
    const key = JSON.stringify(values);

    useEffect(() => {
        if (key === lastKey.current) {
            return;
        }

        const timeout = window.setTimeout(() => {
            lastKey.current = key;
            callback.current();
        }, delay);

        return () => window.clearTimeout(timeout);
    }, [key, delay]);
}

const sectionHeaders = {
    student: {
        title: 'Student Accounts',
        description:
            'Create, edit and manage CCS Connect student accounts using their official student information.',
    },
    faculty: {
        title: 'Faculty Accounts',
        description:
            'Create, edit and manage CCS Connect faculty accounts using their official faculty information.',
    },
    deactivated: {
        title: 'Deactivated Accounts',
        description:
            'Review deactivated student and faculty accounts and reactivate them when access should be restored.',
    },
};

const confirmTones = {
    danger: {
        Icon: Trash2,
        tile: 'text-red-600 ring-red-200/70 shadow-[0_10px_30px_-6px_rgba(239,68,68,0.55)]',
        pulse: 'bg-red-400/40',
        button: 'from-red-600 to-rose-500 shadow-[0_10px_30px_-8px_rgba(239,68,68,0.7)] focus:ring-red-200',
    },
    success: {
        Icon: RotateCcw,
        tile: 'text-emerald-600 ring-emerald-200/70 shadow-[0_10px_30px_-6px_rgba(16,185,129,0.55)]',
        pulse: 'bg-emerald-400/40',
        button: 'from-emerald-600 to-teal-500 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] focus:ring-emerald-200',
    },
};

const CONFIRM_EXIT_MS = 280;
const smoothEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

function ConfirmDialog({ action, processing, onCancel, onConfirm }) {
    const [mounted, setMounted] = useState(false);
    const [visible, setVisible] = useState(false);

    // Keep the last content while the dialog fades out.
    const lastAction = useRef(action);
    const lastProcessing = useRef(processing);

    if (action) {
        lastAction.current = action;
        lastProcessing.current = processing;
    }

    useEffect(() => {
        if (action) {
            setMounted(true);

            const frame = requestAnimationFrame(() =>
                requestAnimationFrame(() => setVisible(true)),
            );

            return () => cancelAnimationFrame(frame);
        }

        setVisible(false);

        const timeout = window.setTimeout(
            () => setMounted(false),
            CONFIRM_EXIT_MS,
        );

        return () => window.clearTimeout(timeout);
    }, [action]);

    useEffect(() => {
        if (!action) {
            return undefined;
        }

        const onKeyDown = (event) => {
            if (event.key === 'Escape' && !processing) {
                onCancel();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [action, processing, onCancel]);

    const view = lastAction.current;

    if (!mounted || !view) {
        return null;
    }

    const isProcessing = action ? processing : lastProcessing.current;
    const tone = confirmTones[view.tone];
    const Icon = tone.Icon;

    return (
        <div
            className={`fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-md transition-opacity ${
                visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={{
                transitionDuration: `${CONFIRM_EXIT_MS}ms`,
                transitionTimingFunction: smoothEase,
            }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-description"
            onClick={() => !isProcessing && onCancel()}
        >
            <div
                className={`relative w-full max-w-sm transition-all ${
                    visible
                        ? 'translate-y-0 scale-100 opacity-100'
                        : 'translate-y-3 scale-[0.97] opacity-0'
                }`}
                style={{
                    transitionDuration: `${CONFIRM_EXIT_MS}ms`,
                    transitionTimingFunction: smoothEase,
                }}
                onClick={(event) => event.stopPropagation()}
            >
                {/* Glass card */}
                <div className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/65 shadow-[0_30px_90px_-20px_rgba(15,23,42,0.5)] ring-1 ring-inset ring-white/40 backdrop-blur-2xl backdrop-saturate-150">
                    <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/60 via-white/5 to-white/20"
                        aria-hidden="true"
                    />
                    <div
                        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent"
                        aria-hidden="true"
                    />

                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isProcessing}
                        aria-label="Close"
                        className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>

                    <div className="relative px-7 pb-6 pt-9 text-center">
                        <div className="relative mx-auto h-16 w-16">
                            <span
                                className={`ax-ring absolute inset-0 rounded-2xl ${tone.pulse}`}
                            />
                            <div
                                className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/70 ring-1 backdrop-blur-xl ${tone.tile}`}
                            >
                                <Icon size={26} />
                            </div>
                        </div>

                        <h2
                            id="confirm-dialog-title"
                            className="mt-5 text-xl font-bold tracking-tight text-slate-950"
                        >
                            {view.title}
                        </h2>
                        <p
                            id="confirm-dialog-description"
                            className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-slate-600"
                        >
                            {view.description}
                        </p>

                        <div className="mt-5 rounded-2xl border border-white/70 bg-white/50 px-4 py-3 text-left shadow-inner backdrop-blur-md">
                            <p className="truncate text-sm font-semibold text-slate-900">
                                {view.name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                {view.meta}
                            </p>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                autoFocus
                                disabled={isProcessing}
                                onClick={onCancel}
                                className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/70 bg-white/50 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 focus:outline-none focus:ring-4 focus:ring-white/70 active:translate-y-0 active:scale-95 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={onConfirm}
                                className={`relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70 ${tone.button}`}
                            >
                                <span
                                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
                                    aria-hidden="true"
                                />
                                {isProcessing && (
                                    <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                )}
                                <span className="relative">
                                    {isProcessing
                                        ? 'Please wait…'
                                        : view.confirmLabel}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Index() {
    const page = usePage();
    const { students, faculty, deactivated } = page.props;
    const requestedSection = new URLSearchParams(
        page.url.split('?')[1] ?? '',
    ).get('section');

    const activeSection = ['student', 'faculty', 'deactivated'].includes(
        requestedSection,
    )
        ? requestedSection
        : 'student';
    const [notification, setNotification] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);
    const [confirmProcessing, setConfirmProcessing] = useState(false);

    const runConfirmedAction = () => {
        if (!confirmAction) {
            return;
        }

        router.patch(
            confirmAction.url,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => setConfirmProcessing(true),
                onSuccess: () => setNotification(confirmAction.success),
                onError: () => setNotification(confirmAction.error),
                onFinish: () => {
                    setConfirmProcessing(false);
                    setConfirmAction(null);
                },
            },
        );
    };
    const [createdAccount, setCreatedAccount] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentYearLevel, setStudentYearLevel] = useState('');
    const [studentBlockNumber, setStudentBlockNumber] = useState('');

    const [facultySearch, setFacultySearch] = useState('');
    const [facultyEmploymentType, setFacultyEmploymentType] = useState('');
    const [deactivatedSearch, setDeactivatedSearch] = useState('');
    const [deactivatedRole, setDeactivatedRole] = useState('');

    useDebouncedFilters(
        [studentSearch, studentYearLevel, studentBlockNumber],
        () =>
            router.get(
                route('admin.accounts.index'),
                {
                    search: studentSearch || undefined,
                    year_level: studentYearLevel || undefined,
                    block_number: studentBlockNumber || undefined,
                    section: 'student',
                    students_page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                    only: ['students'],
                },
            ),
    );

    useDebouncedFilters([facultySearch, facultyEmploymentType], () =>
        router.get(
            route('admin.accounts.index'),
            {
                faculty_search: facultySearch || undefined,
                employment_type: facultyEmploymentType || undefined,
                section: 'faculty',
                faculty_page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['faculty'],
            },
        ),
    );

    useDebouncedFilters([deactivatedSearch, deactivatedRole], () =>
        router.get(
            route('admin.accounts.index'),
            {
                deactivated_search: deactivatedSearch || undefined,
                deactivated_role: deactivatedRole || undefined,
                section: 'deactivated',
                deactivated_page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['deactivated'],
            },
        ),
    );

    const studentForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        student_number: '',
        year_level: '',
        block_number: '',
    });

    const [editingStudent, setEditingStudent] = useState(null);

    const studentEditForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        student_number: '',
        year_level: '',
        block_number: '',
    });

    const [editingFaculty, setEditingFaculty] = useState(null);

    const facultyEditForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        faculty_id: '',
        employment_type: '',
    });

    const facultyForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        faculty_id: '',
        employment_type: '',
    });

    const [accountCreationType, setAccountCreationType] = useState(null);

    const openAccountCreationModal = (type) => {
        if (type === 'student') {
            studentForm.reset();
            studentForm.clearErrors();
        }

        if (type === 'faculty') {
            facultyForm.reset();
            facultyForm.clearErrors();
        }

        setAccountCreationType(type);
    };

    const closeAccountCreationModal = () => {
        if (studentForm.processing || facultyForm.processing) {
            return;
        }

        studentForm.reset();
        studentForm.clearErrors();

        facultyForm.reset();
        facultyForm.clearErrors();

        setAccountCreationType(null);
    };

    useEffect(() => {
        if (!notification) {
            return;
        }
        const timeout = window.setTimeout(() => {
            setNotification(null);
        }, 5000);
        return () => window.clearTimeout(timeout);
    }, [notification]);
    const showSuccessNotification = (accountType, identifier) => {
        setNotification({
            type: 'success',
            title: 'Account Created',
            message: `Successfully added ${accountType} Account (${identifier})`,
        });
    };

    const showErrorNotification = (accountType, errors) => {
        const firstError = Object.values(errors ?? {})[0];

        setNotification({
            type: 'error',
            title: 'Account Creation Failed',
            message:
                firstError ||
                `Failed to create ${accountType} Account. Please check the form and try again.`,
        });
    };
    const handleStudentSubmit = (event) => {
        event.preventDefault();

        const studentNumber = studentForm.data.student_number;

        studentForm.post(route('admin.accounts.students.store'), {
            preserveScroll: true,
            onSuccess: () => {
                const accountCreation = page.props.flash?.account_creation;

                studentForm.reset();
                studentForm.clearErrors();
                setAccountCreationType(null);

                if (accountCreation?.temporary_password) {
                    setCreatedAccount({
                        type: 'Student',
                        identifier: studentNumber,
                        temporaryPassword: accountCreation.temporary_password,
                    });
                    return;
                }

                showSuccessNotification('Student', studentNumber);
            },
            onError: (errors) => {
                showErrorNotification('Student', errors);
            },
        });
    };
    const handleStudentEditSubmit = (event) => {
        event.preventDefault();

        if (!editingStudent) {
            return;
        }

        studentEditForm.put(
            route('admin.accounts.students.update', editingStudent.id),
            {
                preserveScroll: true,
                onSuccess: () => {
                    const studentNumber = studentEditForm.data.student_number;

                    setEditingStudent(null);
                    studentEditForm.reset();
                    studentEditForm.clearErrors();

                    setNotification({
                        type: 'success',
                        title: 'Account Updated',
                        message: `Successfully updated Student Account (${studentNumber})`,
                    });
                },
                onError: (errors) => {
                    showErrorNotification('Student', errors);
                },
            },
        );
    };

    const handleFacultyEditSubmit = (event) => {
        event.preventDefault();

        if (!editingFaculty) {
            return;
        }

        facultyEditForm.put(
            route('admin.accounts.faculty.update', editingFaculty.id),
            {
                preserveScroll: true,
                onSuccess: () => {
                    const facultyId = facultyEditForm.data.faculty_id;

                    setEditingFaculty(null);
                    facultyEditForm.reset();
                    facultyEditForm.clearErrors();

                    setNotification({
                        type: 'success',
                        title: 'Account Updated',
                        message: `Successfully updated Faculty Account (${facultyId})`,
                    });
                },
                onError: (errors) => {
                    showErrorNotification('Faculty', errors);
                },
            },
        );
    };

    const handleFacultySubmit = (event) => {
        event.preventDefault();
        const facultyId = facultyForm.data.faculty_id;
        facultyForm.post(route('admin.accounts.faculty.store'), {
            preserveScroll: true,
            onSuccess: () => {
                const accountCreation = page.props.flash?.account_creation;

                facultyForm.reset();
                facultyForm.clearErrors();
                setAccountCreationType(null);

                if (accountCreation?.temporary_password) {
                    setCreatedAccount({
                        type: 'Faculty',
                        identifier: facultyId,
                        temporaryPassword: accountCreation.temporary_password,
                    });
                    return;
                }

                showSuccessNotification('Faculty', facultyId);
            },
            onError: (errors) => {
                showErrorNotification('Faculty', errors);
            },
        });
    };
    const closeNotification = () => {
        setNotification(null);
    };
    return (
        <AdminConnectLayout>
            <Head title={sectionHeaders[activeSection].title} />
            <div className="mx-auto max-w-7xl pb-2 pt-5 sm:pt-7">
                {/* Page Header */}
                <div className="mb-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div key={activeSection} className="ax-card max-w-3xl">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                {sectionHeaders[activeSection].title}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                {sectionHeaders[activeSection].description}
                            </p>
                        </div>

                        {activeSection !== 'deactivated' && (
                            <div className="w-full shrink-0 sm:w-auto">
                                <AddAccountButton
                                    onClick={() =>
                                        openAccountCreationModal(activeSection)
                                    }
                                />
                            </div>
                        )}
                    </div>
                </div>

                <AccountsMotionStyles />

                {/* Student Accounts */}
                {activeSection === 'student' && (
                    <AccountPanel
                        icon={GraduationCap}
                        tone="blue"
                        title="Student Accounts"
                        description="Active student accounts created and managed by the CCS Connect administrator."
                        count={students.total ?? students.data?.length}
                        toolbar={
                            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap">
                                <SearchBox
                                    id="student-search"
                                    value={studentSearch}
                                    onChange={(event) => setStudentSearch(event.target.value)}
                                    placeholder="Search name or student ID"
                                />

                                <FilterSelect
                                    label="Year level"
                                    value={studentYearLevel}
                                    onChange={(event) =>
                                        setStudentYearLevel(event.target.value)
                                    }
                                >
                                    <option value="">All Year Levels</option>
                                    <option value="1st Year">1st Year</option>
                                    <option value="2nd Year">2nd Year</option>
                                    <option value="3rd Year">3rd Year</option>
                                    <option value="4th Year">4th Year</option>
                                </FilterSelect>

                                <input
                                    type="text"
                                    value={studentBlockNumber}
                                    onChange={(event) =>
                                        setStudentBlockNumber(event.target.value)
                                    }
                                    placeholder="Section"
                                    aria-label="Section"
                                    className={`${toolbarFieldClass} min-w-[7rem] flex-1 px-3.5 sm:w-28 sm:flex-none`}
                                />
                            </div>
                        }
                    >
                        <AccountTable
                            minWidth="min-w-[1100px]"
                            headers={[
                                { label: 'Full Name', width: '22%' },
                                { label: 'Student ID', width: '12%' },
                                { label: 'Year Level', width: '10%' },
                                { label: 'Section', width: '9%' },
                                { label: 'Role', width: '9%' },
                                { label: 'Status', width: '11%' },
                                { label: 'Last Login', width: '15%' },
                                { label: 'Actions', width: '12%', right: true },
                            ]}
                        >
                            {students.data?.length ? (
                                students.data.map((student, index) => (
                                    <tr
                                        key={student.id}
                                        className="ax-row group transition-colors duration-200 hover:bg-blue-50/40"
                                        style={rowDelay(index)}
                                    >
                                        <td className="px-6 py-3.5">
                                            <NameCell user={student} tone="blue" />
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                                                {student.student_number || '\u2014'}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5 text-sm text-slate-600">
                                            {student.year_level || '\u2014'}
                                        </td>

                                        <td className="px-4 py-3.5 text-sm text-slate-600">
                                            {student.block_number || '\u2014'}
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700 ring-1 ring-blue-100">
                                                {student.role}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <StatusBadge lastSeenAt={student.last_seen_at} />
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                                            {formatLastLogin(student.last_login_at)}
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingStudent(student);
                                                        studentEditForm.setData({
                                                            first_name: student.first_name ?? '',
                                                            middle_name: student.middle_name ?? '',
                                                            last_name: student.last_name ?? '',
                                                            student_number: student.student_number ?? '',
                                                            year_level: student.year_level ?? '',
                                                            block_number: student.block_number ?? '',
                                                        });
                                                        studentEditForm.clearErrors();
                                                    }}
                                                    title={`Edit ${formatFullName(student)}`}
                                                    className={editBtnClass}
                                                    aria-label={`Edit ${formatFullName(student)}`}
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    title={`Deactivate ${formatFullName(student)}`}
                                                    aria-label={`Deactivate ${formatFullName(student)}`}
                                                    onClick={() =>
                                                        setConfirmAction({
                                                            tone: 'danger',
                                                            title: 'Deactivate account?',
                                                            description:
                                                                'This account will no longer be able to log in. You can reactivate it later from the Deactivated tab.',
                                                            name: formatFullName(student),
                                                            meta: `Student · ${student.student_number || 'No ID'}`,
                                                            confirmLabel: 'Deactivate',
                                                            url: route(
                                                                'admin.accounts.students.deactivate',
                                                                student.id,
                                                            ),
                                                            success: {
                                                                type: 'success',
                                                                title: 'Account Deactivated',
                                                                message: `Successfully deactivated Student Account (${student.student_number})`,
                                                            },
                                                            error: {
                                                                type: 'error',
                                                                title: 'Deactivation Failed',
                                                                message:
                                                                    'The student account could not be deactivated. Please try again.',
                                                            },
                                                        })
                                                    }
                                                    className={dangerBtnClass}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8">
                                        <EmptyTableState message="Try changing the search or student filters." />
                                    </td>
                                </tr>
                            )}
                        </AccountTable>

                        <Pagination
                            paginator={students}
                            onPageChange={(page) =>
                                router.get(
                                    route('admin.accounts.index'),
                                    {
                                        search: studentSearch || undefined,
                                        year_level: studentYearLevel || undefined,
                                        block_number: studentBlockNumber || undefined,
                                        section: 'student',
                                        students_page: page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        />
                    </AccountPanel>
                )}

                {/* Faculty Accounts */}
                {activeSection === 'faculty' && (
                    <AccountPanel
                        icon={Users}
                        tone="cyan"
                        title="Faculty Accounts"
                        description="Active faculty accounts created and managed by the CCS Connect administrator."
                        count={faculty.total ?? faculty.data?.length}
                        toolbar={
                            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap">
                                <SearchBox
                                    id="faculty-search"
                                    value={facultySearch}
                                    onChange={(event) => setFacultySearch(event.target.value)}
                                    placeholder="Search name or faculty ID"
                                />

                                <FilterSelect
                                    label="Employment type"
                                    value={facultyEmploymentType}
                                    onChange={(event) =>
                                        setFacultyEmploymentType(event.target.value)
                                    }
                                >
                                    <option value="">All Employment Types</option>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                </FilterSelect>
                            </div>
                        }
                    >
                        <AccountTable
                        minWidth="min-w-[1000px]"
                            headers={[
                                { label: 'Full Name', width: '23%' },
                                { label: 'Faculty ID', width: '13%' },
                                { label: 'Employment', width: '13%' },
                                { label: 'Role', width: '11%' },
                                { label: 'Status', width: '12%' },
                                { label: 'Last Login', width: '16%' },
                                { label: 'Actions', width: '12%', right: true },
                            ]}
                        >
                            {faculty.data?.length ? (
                                faculty.data.map((member, index) => (
                                    <tr
                                        key={member.id}
                                        className="ax-row group transition-colors duration-200 hover:bg-cyan-50/40"
                                        style={rowDelay(index)}
                                    >
                                        <td className="px-6 py-3.5">
                                            <NameCell user={member} tone="cyan" />
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">
                                                {member.faculty_id || '\u2014'}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                                {member.employment_type || '\u2014'}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <span className="inline-flex rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-semibold capitalize text-cyan-700 ring-1 ring-cyan-100">
                                                {member.role}
                                            </span>
                                        </td>

                                        <td className="px-4 py-3.5">
                                            <StatusBadge lastSeenAt={member.last_seen_at} />
                                        </td>

                                        <td className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-600">
                                            {formatLastLogin(member.last_login_at)}
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingFaculty(member);
                                                        facultyEditForm.setData({
                                                            first_name: member.first_name ?? '',
                                                            middle_name: member.middle_name ?? '',
                                                            last_name: member.last_name ?? '',
                                                            suffix: member.suffix ?? '',
                                                            faculty_id: member.faculty_id ?? '',
                                                            employment_type: member.employment_type ?? '',
                                                        });
                                                        facultyEditForm.clearErrors();
                                                    }}
                                                    title={`Edit ${formatFullName(member)}`}
                                                    className={editBtnClass}
                                                    aria-label={`Edit ${formatFullName(member)}`}
                                                >
                                                    <Pencil size={15} />
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setConfirmAction({
                                                            tone: 'danger',
                                                            title: 'Deactivate account?',
                                                            description:
                                                                'This account will no longer be able to log in. You can reactivate it later from the Deactivated tab.',
                                                            name: formatFullName(member),
                                                            meta: `Faculty · ${member.faculty_id || 'No ID'}`,
                                                            confirmLabel: 'Deactivate',
                                                            url: route(
                                                                'admin.accounts.faculty.deactivate',
                                                                member.id,
                                                            ),
                                                            success: {
                                                                type: 'success',
                                                                title: 'Account Deactivated',
                                                                message: `Successfully deactivated Faculty Account (${member.faculty_id})`,
                                                            },
                                                            error: {
                                                                type: 'error',
                                                                title: 'Deactivation Failed',
                                                                message:
                                                                    'The faculty account could not be deactivated. Please try again.',
                                                            },
                                                        })
                                                    }
                                                    title={`Deactivate ${formatFullName(member)}`}
                                                    className={dangerBtnClass}
                                                    aria-label={`Deactivate ${formatFullName(member)}`}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7">
                                        <EmptyTableState message="Try changing the search or employment filter." />
                                    </td>
                                </tr>
                            )}
                        </AccountTable>

                        <Pagination
                            paginator={faculty}
                            onPageChange={(page) =>
                                router.get(
                                    route('admin.accounts.index'),
                                    {
                                        faculty_search: facultySearch || undefined,
                                        employment_type: facultyEmploymentType || undefined,
                                        section: 'faculty',
                                        faculty_page: page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        />
                    </AccountPanel>
                )}

                {/* Deactivated Accounts */}
                {activeSection === 'deactivated' && (
                    <AccountPanel
                        icon={RotateCcw}
                        tone="slate"
                        title="Deactivated Accounts"
                        description="View and reactivate previously deactivated student and faculty accounts."
                        count={deactivated?.total ?? deactivated?.data?.length}
                        toolbar={
                            <div className="flex w-full flex-wrap gap-2 lg:w-auto lg:flex-nowrap">
                                <FilterSelect
                                    label="Role"
                                    value={deactivatedRole}
                                    onChange={(event) =>
                                        setDeactivatedRole(event.target.value)
                                    }
                                >
                                    <option value="">All Roles</option>
                                    <option value="student">Student</option>
                                    <option value="faculty">Faculty</option>
                                </FilterSelect>

                                <SearchBox
                                    id="deactivated-search"
                                    value={deactivatedSearch}
                                    onChange={(event) =>
                                        setDeactivatedSearch(event.target.value)
                                    }
                                    placeholder="Search name or ID"
                                />
                            </div>
                        }
                    >
                        <AccountTable
                            minWidth="min-w-[900px]"
                            headers={[
                                { label: 'Full Name', width: '28%' },
                                { label: 'ID Number', width: '14%' },
                                { label: 'Role', width: '14%' },
                                { label: 'Time Deactivated', width: '26%' },
                                { label: 'Action', width: '18%', right: true },
                            ]}
                        >
                            {deactivated?.data?.length ? (
                                deactivated.data.map((member, index) => (
                                    <tr
                                        key={member.id}
                                        className="ax-row group transition-colors duration-200 hover:bg-emerald-50/40"
                                        style={{
                                            ...rowDelay(index),
                                            '--ax-accent': '#10b981',
                                        }}
                                    >
                                        <td className="px-6 py-3.5">
                                            <div className="opacity-80 transition-opacity duration-200 group-hover:opacity-100">
                                                <NameCell user={member} tone="slate" />
                                            </div>
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                                                {member.student_number ??
                                                    member.faculty_id ??
                                                    '-'}
                                            </span>
                                        </td>

                                        <td className="px-6 py-3.5">
                                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-700 ring-1 ring-slate-200">
                                                {member.role}
                                            </span>
                                        </td>

                                        <td className="px-6 py-3.5 text-sm text-slate-600">
                                            {member.deactivated_at
                                                ? new Date(
                                                    member.deactivated_at,
                                                ).toLocaleString()
                                                : '-'}
                                        </td>

                                        <td className="px-6 py-3.5 text-right">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setConfirmAction({
                                                        tone: 'success',
                                                        title: 'Reactivate account?',
                                                        description:
                                                            'This account will be allowed to log in again.',
                                                        name: formatFullName(member),
                                                        meta: `${member.role === 'student' ? 'Student' : 'Faculty'} · ${member.student_number ?? member.faculty_id ?? 'No ID'}`,
                                                        confirmLabel: 'Reactivate',
                                                        url: route(
                                                            'admin.accounts.reactivate',
                                                            member.id,
                                                        ),
                                                        success: {
                                                            type: 'success',
                                                            title: 'Account Reactivated',
                                                            message: `Successfully reactivated ${member.role === 'student' ? 'Student' : 'Faculty'} Account (${member.student_number ?? member.faculty_id})`,
                                                        },
                                                        error: {
                                                            type: 'error',
                                                            title: 'Reactivation Failed',
                                                            message:
                                                                'The account could not be reactivated. Please try again.',
                                                        },
                                                    })
                                                }
                                                title={`Reactivate ${formatFullName(member)}`}
                                                className="ax-react inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-3.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-emerald-500 hover:text-white hover:shadow-lg hover:shadow-emerald-500/25 active:scale-95"
                                                aria-label={`Reactivate ${formatFullName(member)}`}
                                            >
                                                <RotateCcw size={15} />
                                                Reactivate
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">
                                        <EmptyTableState message="No deactivated accounts found." />
                                    </td>
                                </tr>
                            )}
                        </AccountTable>

                        <Pagination
                            paginator={deactivated}
                            onPageChange={(page) =>
                                router.get(
                                    route('admin.accounts.index'),
                                    {
                                        deactivated_search: deactivatedSearch || undefined,
                                        deactivated_role: deactivatedRole || undefined,
                                        section: 'deactivated',
                                        deactivated_page: page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        />
                    </AccountPanel>
                )}

                {/* Account Creation Modal */}
                {accountCreationType && (
                    <div
                        className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-creation-modal-title"
                    >
                        <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                            {/* Modal Header */}
                            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                        {accountCreationType === 'student' ? (
                                            <GraduationCap size={20} />
                                        ) : (
                                            <UserPlus size={20} />
                                        )}
                                    </div>

                                    <div>
                                        <h2
                                            id="account-creation-modal-title"
                                            className="text-lg font-bold text-slate-950"
                                        >
                                            {accountCreationType === 'student'
                                                ? 'Create Student Account'
                                                : 'Create Faculty Account'}
                                        </h2>

                                        <p className="mt-0.5 text-sm text-slate-500">
                                            {accountCreationType === 'student'
                                                ? 'Create an approved CCS Connect student account using the official student information.'
                                                : 'Create an approved CCS Connect faculty account with the required employment information.'}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeAccountCreationModal}
                                    disabled={
                                        studentForm.processing || facultyForm.processing
                                    }
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    aria-label="Close account creation modal"
                                >
                                    <X size={19} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="overflow-y-auto px-6 py-6">
                                {accountCreationType === 'student' && (
                                    <form
                                        onSubmit={handleStudentSubmit}
                                        className="space-y-6"
                                    >
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <FormField
                                                label="First Name"
                                                name="first_name"
                                                id="student-first-name"
                                                value={studentForm.data.first_name}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'first_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.first_name}
                                                placeholder="Enter first name"
                                                required
                                            />

                                            <FormField
                                                label="Middle Name"
                                                name="middle_name"
                                                id="student-middle-name"
                                                value={studentForm.data.middle_name}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'middle_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.middle_name}
                                                placeholder="Optional"
                                            />

                                            <FormField
                                                label="Last Name"
                                                name="last_name"
                                                id="student-last-name"
                                                value={studentForm.data.last_name}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'last_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.last_name}
                                                placeholder="Enter last name"
                                                required
                                            />

                                            <FormField
                                                label="Student Number"
                                                name="student_number"
                                                id="student-number"
                                                value={studentForm.data.student_number}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'student_number',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.student_number}
                                                placeholder="00-00-000"
                                                required
                                            />

                                            <SelectField
                                                label="Year Level"
                                                name="year_level"
                                                id="student-year-level"
                                                value={studentForm.data.year_level}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'year_level',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.year_level}
                                                placeholder="Select year level"
                                                required
                                                options={[
                                                    {
                                                        value: '1st Year',
                                                        label: '1st Year',
                                                    },
                                                    {
                                                        value: '2nd Year',
                                                        label: '2nd Year',
                                                    },
                                                    {
                                                        value: '3rd Year',
                                                        label: '3rd Year',
                                                    },
                                                    {
                                                        value: '4th Year',
                                                        label: '4th Year',
                                                    },
                                                ]}
                                            />

                                            <FormField
                                                label="Block / Section"
                                                name="block_number"
                                                id="student-block-number"
                                                value={studentForm.data.block_number}
                                                onChange={(event) =>
                                                    studentForm.setData(
                                                        'block_number',
                                                        event.target.value,
                                                    )
                                                }
                                                error={studentForm.errors.block_number}
                                                placeholder="e.g. BSIT-31"
                                                required
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                            <button
                                                type="button"
                                                onClick={closeAccountCreationModal}
                                                disabled={studentForm.processing}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={studentForm.processing}
                                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {studentForm.processing
                                                    ? 'Creating...'
                                                    : 'Create Student'}
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {accountCreationType === 'faculty' && (
                                    <form
                                        onSubmit={handleFacultySubmit}
                                        className="space-y-6"
                                    >
                                        <div className="grid gap-5 sm:grid-cols-2">
                                            <FormField
                                                label="First Name"
                                                name="first_name"
                                                id="faculty-first-name"
                                                value={facultyForm.data.first_name}
                                                onChange={(event) =>
                                                    facultyForm.setData(
                                                        'first_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={facultyForm.errors.first_name}
                                                placeholder="Enter first name"
                                                required
                                            />

                                            <FormField
                                                label="Middle Name"
                                                name="middle_name"
                                                id="faculty-middle-name"
                                                value={facultyForm.data.middle_name}
                                                onChange={(event) =>
                                                    facultyForm.setData(
                                                        'middle_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={facultyForm.errors.middle_name}
                                                placeholder="Optional"
                                            />

                                            <FormField
                                                label="Last Name"
                                                name="last_name"
                                                id="faculty-last-name"
                                                value={facultyForm.data.last_name}
                                                onChange={(event) =>
                                                    facultyForm.setData(
                                                        'last_name',
                                                        event.target.value,
                                                    )
                                                }
                                                error={facultyForm.errors.last_name}
                                                placeholder="Enter last name"
                                                required
                                            />

                                            <FormField
                                                label="Suffix"
                                                name="suffix"
                                                id="faculty-suffix"
                                                value={facultyForm.data.suffix}
                                                onChange={(event) =>
                                                    facultyForm.setData(
                                                        'suffix',
                                                        event.target.value,
                                                    )
                                                }
                                                error={facultyForm.errors.suffix}
                                                placeholder="Optional"
                                            />

                                            <div className="sm:col-span-2">
                                                <FormField
                                                    label="Faculty ID Number"
                                                    name="faculty_id"
                                                    id="faculty-id"
                                                    value={facultyForm.data.faculty_id}
                                                    onChange={(event) =>
                                                        facultyForm.setData(
                                                            'faculty_id',
                                                            event.target.value,
                                                        )
                                                    }
                                                    error={facultyForm.errors.faculty_id}
                                                    placeholder="Enter faculty ID number"
                                                    required
                                                />
                                            </div>

                                            <div className="sm:col-span-2">
                                                <SelectField
                                                    label="Employment Type"
                                                    name="employment_type"
                                                    id="faculty-employment-type"
                                                    value={facultyForm.data.employment_type}
                                                    onChange={(event) =>
                                                        facultyForm.setData(
                                                            'employment_type',
                                                            event.target.value,
                                                        )
                                                    }
                                                    error={
                                                        facultyForm.errors.employment_type
                                                    }
                                                    placeholder="Select employment type"
                                                    required
                                                    options={[
                                                        {
                                                            value: 'Full-time',
                                                            label: 'Full-time',
                                                        },
                                                        {
                                                            value: 'Part-time',
                                                            label: 'Part-time',
                                                        },
                                                    ]}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                            <button
                                                type="button"
                                                onClick={closeAccountCreationModal}
                                                disabled={facultyForm.processing}
                                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={facultyForm.processing}
                                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {facultyForm.processing
                                                    ? 'Creating...'
                                                    : 'Create Faculty'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        <ConfirmDialog
            action={confirmAction}
            processing={confirmProcessing}
            onCancel={() => setConfirmAction(null)}
            onConfirm={runConfirmedAction}
        />

        {/* Account Creation Notification */}
        {notification && (
            <div className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-md">
                <div
                    className={`flex items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-xl ${
                        notification.type === 'success'
                            ? 'border-emerald-200'
                            : 'border-red-200'
                    }`}
                    role="alert"
                >
                    <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            notification.type === 'success'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-red-100 text-red-600'
                        }`}
                    >
                        {notification.type === 'success' ? (
                            <CheckCircle2 size={19} />
                        ) : (
                            <AlertCircle size={19} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className={`text-sm font-semibold ${
                                notification.type === 'success'
                                    ? 'text-emerald-800'
                                    : 'text-red-800'
                            }`}
                        >
                            {notification.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                            {notification.message}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeNotification}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close notification"
                    >
                        <X size={17} />
                    </button>
                </div>
            </div>
        )}
        {createdAccount && (
            <div
                className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="temporary-password-modal-title"
            >
                <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
                    <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6 py-6">
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle2 size={14} />
                            Account Created
                        </div>

                        <h2
                            id="temporary-password-modal-title"
                            className="text-2xl font-bold text-slate-950"
                        >
                            {createdAccount.type} Account Created
                        </h2>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            The account was created successfully. Give the
                            temporary password to the account owner securely.
                        </p>
                    </div>

                    <div className="space-y-5 px-6 py-6">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Account ID
                            </p>
                            <p className="mt-1 text-base font-bold text-slate-800">
                                {createdAccount.identifier}
                            </p>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-slate-700">
                                    Temporary Password
                                </p>

                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(
                                            createdAccount.temporaryPassword,
                                        );
                                    }}
                                    className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                >
                                    <Copy size={14} />
                                    Copy Password
                                </button>
                            </div>

                            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                                <p className="break-all font-mono text-lg font-bold tracking-wide text-blue-900">
                                    {createdAccount.temporaryPassword}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                            <p className="text-sm font-semibold text-amber-900">
                                Security reminder
                            </p>
                            <p className="mt-1 text-sm leading-5 text-amber-800">
                                Share this temporary password securely. The
                                account owner will be required to change it
                                during their first login.
                            </p>
                        </div>

                        <div className="flex justify-end border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={() => setCreatedAccount(null)}
                                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        {editingStudent && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-edit-modal-title"
            >
                <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/70 px-6 py-5">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                <Pencil size={13} />
                                Edit Student Account
                            </div>

                            <h2
                                id="student-edit-modal-title"
                                className="text-xl font-bold text-slate-950"
                            >
                                Update Student Information
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Update the official information for{' '}
                                <span className="font-semibold text-slate-700">
                                    {formatFullName(editingStudent)}
                                </span>
                                .
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (studentEditForm.processing) {
                                    return;
                                }

                                setEditingStudent(null);
                                studentEditForm.reset();
                                studentEditForm.clearErrors();
                            }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Close student edit modal"
                            disabled={studentEditForm.processing}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form
                        onSubmit={handleStudentEditSubmit}
                        className="max-h-[75vh] overflow-y-auto"
                    >
                        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                            <FormField
                                label="First Name"
                                name="first_name"
                                id="edit-student-first-name"
                                value={studentEditForm.data.first_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.first_name}
                                placeholder="Enter first name"
                                required
                            />

                            <FormField
                                label="Middle Name"
                                name="middle_name"
                                id="edit-student-middle-name"
                                value={studentEditForm.data.middle_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'middle_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.middle_name}
                                placeholder="Optional"
                            />

                            <FormField
                                label="Last Name"
                                name="last_name"
                                id="edit-student-last-name"
                                value={studentEditForm.data.last_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.last_name}
                                placeholder="Enter last name"
                                required
                            />

                            <FormField
                                label="Student Number"
                                name="student_number"
                                id="edit-student-number"
                                value={studentEditForm.data.student_number}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'student_number',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.student_number}
                                placeholder="00-00-000"
                                required
                            />

                            <SelectField
                                label="Year Level"
                                name="year_level"
                                id="edit-student-year-level"
                                value={studentEditForm.data.year_level}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'year_level',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.year_level}
                                placeholder="Select year level"
                                required
                                options={[
                                    {
                                        value: '1st Year',
                                        label: '1st Year',
                                    },
                                    {
                                        value: '2nd Year',
                                        label: '2nd Year',
                                    },
                                    {
                                        value: '3rd Year',
                                        label: '3rd Year',
                                    },
                                    {
                                        value: '4th Year',
                                        label: '4th Year',
                                    },
                                ]}
                            />

                            <FormField
                                label="Block / Section"
                                name="block_number"
                                id="edit-student-block-number"
                                value={studentEditForm.data.block_number}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'block_number',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.block_number}
                                placeholder="e.g. BSIT-31"
                                required
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingStudent(null);
                                    studentEditForm.reset();
                                    studentEditForm.clearErrors();
                                }}
                                disabled={studentEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={studentEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {studentEditForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        {editingFaculty && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="faculty-edit-modal-title"
            >
                <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/70 px-6 py-5">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-700">
                                <Pencil size={13} />
                                Edit Faculty Account
                            </div>

                            <h2
                                id="faculty-edit-modal-title"
                                className="text-xl font-bold text-slate-950"
                            >
                                Update Faculty Information
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Update the official information for{' '}
                                <span className="font-semibold text-slate-700">
                                    {formatFullName(editingFaculty)}
                                </span>
                                .
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (facultyEditForm.processing) {
                                    return;
                                }

                                setEditingFaculty(null);
                                facultyEditForm.reset();
                                facultyEditForm.clearErrors();
                            }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Close faculty edit modal"
                            disabled={facultyEditForm.processing}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form
                        onSubmit={handleFacultyEditSubmit}
                        className="max-h-[75vh] overflow-y-auto"
                    >
                        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                            <FormField
                                label="First Name"
                                name="first_name"
                                id="edit-faculty-first-name"
                                value={facultyEditForm.data.first_name}
                                onChange={(event) =>
                                    facultyEditForm.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyEditForm.errors.first_name}
                                placeholder="Enter first name"
                                required
                            />

                            <FormField
                                label="Middle Name"
                                name="middle_name"
                                id="edit-faculty-middle-name"
                                value={facultyEditForm.data.middle_name}
                                onChange={(event) =>
                                    facultyEditForm.setData(
                                        'middle_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyEditForm.errors.middle_name}
                                placeholder="Optional"
                            />

                            <FormField
                                label="Last Name"
                                name="last_name"
                                id="edit-faculty-last-name"
                                value={facultyEditForm.data.last_name}
                                onChange={(event) =>
                                    facultyEditForm.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyEditForm.errors.last_name}
                                placeholder="Enter last name"
                                required
                            />

                            <FormField
                                label="Suffix"
                                name="suffix"
                                id="edit-faculty-suffix"
                                value={facultyEditForm.data.suffix}
                                onChange={(event) =>
                                    facultyEditForm.setData(
                                        'suffix',
                                        event.target.value,
                                    )
                                }
                                error={facultyEditForm.errors.suffix}
                                placeholder="Optional"
                            />

                            <div className="sm:col-span-2">
                                <FormField
                                    label="Faculty ID Number"
                                    name="faculty_id"
                                    id="edit-faculty-id"
                                    value={facultyEditForm.data.faculty_id}
                                    onChange={(event) =>
                                        facultyEditForm.setData(
                                            'faculty_id',
                                            event.target.value,
                                        )
                                    }
                                    error={facultyEditForm.errors.faculty_id}
                                    placeholder="Enter faculty ID number"
                                    required
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <SelectField
                                    label="Employment Type"
                                    name="employment_type"
                                    id="edit-faculty-employment-type"
                                    value={
                                        facultyEditForm.data.employment_type
                                    }
                                    onChange={(event) =>
                                        facultyEditForm.setData(
                                            'employment_type',
                                            event.target.value,
                                        )
                                    }
                                    error={
                                        facultyEditForm.errors.employment_type
                                    }
                                    placeholder="Select employment type"
                                    required
                                    options={[
                                        {
                                            value: 'Full-time',
                                            label: 'Full-time',
                                        },
                                        {
                                            value: 'Part-time',
                                            label: 'Part-time',
                                        },
                                    ]}
                                />
                            </div>
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingFaculty(null);
                                    facultyEditForm.reset();
                                    facultyEditForm.clearErrors();
                                }}
                                disabled={facultyEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={facultyEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {facultyEditForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </AdminConnectLayout>
    );
}
