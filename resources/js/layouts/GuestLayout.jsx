import { Link } from '@inertiajs/react';
import {
    Eye,
    EyeOff,
    FileText,
    Loader2,
    Shield,
    UserRound,
} from 'lucide-react';
import { useState } from 'react';

/* -------------------------------------------------------------------------- */
/*  Page copy                                                                 */
/* -------------------------------------------------------------------------- */

const pageContent = {
    login: {
        title: 'Welcome Back',
        description: (
            <>
                <span className="block">Sign in to access the</span>
                <span className="block font-semibold text-brand-600">
                    CCS Connect
                </span>
                <span className="block">Student and Faculty Dashboard.</span>
            </>
        ),
    },
    register: {
        title: 'Welcome to CCS Connect',
        description: (
            <>
                <span className="block">
                    Create your student account and stay
                </span>
                <span className="block">
                    connected with the{' '}
                    <span className="font-semibold text-brand-600">
                        College of Computer Studies.
                    </span>
                </span>
            </>
        ),
    },
};

/* -------------------------------------------------------------------------- */
/*  Shared auth form components (used by Login.jsx and Register.jsx)          */
/* -------------------------------------------------------------------------- */

export function AuthInput({
    id,
    label,
    icon: Icon,
    error,
    trailing,
    ...props
}) {
    const errorId = `${id}-error`;

    return (
        <div>
            <label
                htmlFor={id}
                className="mb-2 block text-sm font-semibold text-ink"
            >
                {label}
            </label>

            <div className="group relative">
                <Icon
                    aria-hidden="true"
                    size={20}
                    strokeWidth={1.8}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 group-focus-within:text-brand-600"
                />

                <input
                    id={id}
                    name={id}
                    aria-invalid={error ? 'true' : 'false'}
                    aria-describedby={error ? errorId : undefined}
                    className={`block h-14 w-full rounded-xl border bg-white pl-12 ${
                        trailing ? 'pr-12' : 'pr-4'
                    } text-base text-ink outline-none transition duration-200 placeholder:text-slate-400 ${
                        error
                            ? 'border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                            : 'border-slate-200 hover:border-slate-300 focus:border-brand-600 focus:ring-4 focus:ring-brand-600/10'
                    }`}
                    {...props}
                />

                {trailing}
            </div>

            {error && (
                <p
                    id={errorId}
                    role="alert"
                    className="mt-2 text-sm font-medium text-red-600"
                >
                    {error}
                </p>
            )}
        </div>
    );
}

export function AuthPasswordInput(props) {
    const [visible, setVisible] = useState(false);

    return (
        <AuthInput
            {...props}
            type={visible ? 'text' : 'password'}
            trailing={
                <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-50 hover:text-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                    aria-label={visible ? 'Hide password' : 'Show password'}
                    aria-pressed={visible}
                >
                    {visible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
            }
        />
    );
}

export function AuthButton({ processing, icon: Icon, loadingText, children }) {
    return (
        <button
            type="submit"
            disabled={processing}
            aria-busy={processing}
            className="group mt-2 flex h-14 w-full items-center justify-center gap-2.5 rounded-xl bg-brand-600 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition duration-200 hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-xl hover:shadow-brand-600/30 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-600/30 active:translate-y-0 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
        >
            {processing ? (
                <Loader2 size={20} className="animate-spin" />
            ) : (
                <Icon
                    size={20}
                    strokeWidth={2}
                    className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
            )}

            <span>{processing ? loadingText : children}</span>
        </button>
    );
}

/* -------------------------------------------------------------------------- */
/*  Decorative pieces                                                         */
/* -------------------------------------------------------------------------- */

function AdminIcon({ size = 32 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="9" cy="7" r="3.6" />
            <path d="M3 20.5v-1a5 5 0 0 1 5-5h1.5" />
            <path d="M17 12.5l4 1.5v3.2c0 2.2-1.6 3.6-4 4.3-2.4-.7-4-2.1-4-4.3V14z" />
        </svg>
    );
}

const networkNodes = [
    [60, 170],
    [210, 70],
    [330, 25],
    [430, 115],
    [530, 30],
    [630, 120],
    [300, 185],
    [120, 265],
    [560, 245],
];

const networkEdges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],
    [4, 5],
    [1, 6],
    [3, 6],
    [0, 7],
    [6, 8],
    [5, 8],
];

function HeroIllustration() {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-10 left-[5%] hidden h-72.5 w-160 origin-bottom-left animate-fade-in scale-[0.78] lg:block xl:scale-95 2xl:scale-100 [@media(max-height:760px)]:hidden"
        >
            {/* Faint campus building */}
            <svg
                viewBox="0 0 420 200"
                className="absolute -top-16 left-37.5 h-55 w-105 text-brand-200 opacity-45"
                fill="currentColor"
            >
                <rect x="0" y="150" width="420" height="50" />
                <rect x="110" y="70" width="200" height="80" />
                <polygon points="100,70 210,20 320,70" />
                <rect x="20" y="105" width="90" height="45" />
                <rect x="310" y="105" width="90" height="45" />
                {[130, 160, 190, 220, 250, 280].map((x) => (
                    <rect
                        key={x}
                        x={x}
                        y="82"
                        width="10"
                        height="68"
                        className="text-white"
                        fill="currentColor"
                        opacity="0.7"
                    />
                ))}
            </svg>

            {/* Network */}
            <svg
                viewBox="0 0 700 300"
                className="absolute -left-10 -top-24 h-75 w-175"
            >
                {networkEdges.map(([a, b]) => (
                    <line
                        key={`${a}-${b}`}
                        x1={networkNodes[a][0]}
                        y1={networkNodes[a][1]}
                        x2={networkNodes[b][0]}
                        y2={networkNodes[b][1]}
                        stroke="#8db4ff"
                        strokeOpacity="0.4"
                        strokeWidth="1"
                    />
                ))}
                {networkNodes.map(([x, y], index) => (
                    <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#5b93ff"
                        className="animate-node"
                        style={{ animationDelay: `${index * 0.35}s` }}
                    />
                ))}
            </svg>

            {/* Donut stats card */}
            <div className="absolute left-17.5 top-0 flex h-23 w-51.25 animate-float-slow items-center gap-4 rounded-2xl border border-white/80 bg-white/70 px-5 shadow-lg shadow-brand-500/10 backdrop-blur-md">
                <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
                    <circle
                        cx="22"
                        cy="22"
                        r="16"
                        fill="none"
                        stroke="#bcd3ff"
                        strokeWidth="9"
                    />
                    <circle
                        cx="22"
                        cy="22"
                        r="16"
                        fill="none"
                        stroke="#5b93ff"
                        strokeWidth="9"
                        strokeDasharray="62 100"
                    />
                </svg>
                <div className="flex-1 space-y-2">
                    <div className="h-2 w-full rounded-full bg-brand-100" />
                    <div className="h-2 w-3/4 rounded-full bg-brand-100" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-100" />
                </div>
            </div>

            {/* Profile card */}
            <div className="absolute left-0 top-25 flex h-22 w-50.5 animate-float items-center gap-4 rounded-2xl border border-white/80 bg-white/75 px-5 shadow-lg shadow-brand-500/10 backdrop-blur-md">
                <UserRound
                    size={38}
                    strokeWidth={0}
                    fill="currentColor"
                    className="shrink-0 text-brand-400"
                />
                <div className="flex-1 space-y-2">
                    <div className="h-2 w-3/4 rounded-full bg-slate-200/80" />
                    <div className="h-2 w-full rounded-full bg-slate-200/80" />
                    <div className="h-2 w-1/2 rounded-full bg-slate-200/80" />
                </div>
            </div>

            {/* Bar chart card */}
            <div className="absolute left-56.25 top-30.5 flex h-30.5 w-44.25 animate-float-slow items-end gap-3 rounded-2xl border border-white/80 bg-white/70 px-6 pb-5 shadow-lg shadow-brand-500/10 backdrop-blur-md">
                {[
                    ['h-6', 'bg-brand-200'],
                    ['h-9', 'bg-brand-300'],
                    ['h-14', 'bg-brand-500'],
                    ['h-8', 'bg-brand-600'],
                    ['h-18', 'bg-brand-600'],
                ].map(([height, color], index) => (
                    <div
                        key={index}
                        className={`w-3.5 rounded-sm ${height} ${color}`}
                    />
                ))}
            </div>

            {/* Shield with lock */}
            <svg
                viewBox="0 0 100 122"
                className="absolute left-105.75 top-27 h-38.5 w-31.75 animate-float drop-shadow-[0_18px_28px_rgba(10,99,245,0.35)]"
            >
                <defs>
                    <linearGradient
                        id="shield-gradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="1"
                    >
                        <stop offset="0" stopColor="#5b93ff" />
                        <stop offset="1" stopColor="#0a63f5" />
                    </linearGradient>
                </defs>
                <path
                    d="M50 3 92 19v39c0 30-22 50-42 60C30 108 8 88 8 58V19z"
                    fill="url(#shield-gradient)"
                    stroke="#dce9ff"
                    strokeWidth="4"
                    strokeLinejoin="round"
                />
                <path
                    d="M38 52v-8a12 12 0 0 1 24 0v8"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="6"
                    strokeLinecap="round"
                />
                <rect x="30" y="52" width="40" height="30" rx="6" fill="#fff" />
                <circle cx="50" cy="65" r="4" fill="#2f74fb" />
                <rect x="48" y="66" width="4" height="9" rx="2" fill="#2f74fb" />
            </svg>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/*  Layout                                                                    */
/* -------------------------------------------------------------------------- */

export default function GuestLayout({ children, mode = 'login' }) {
    const content = pageContent[mode] ?? pageContent.login;

    return (
        <div className="min-h-screen overflow-hidden bg-[#f8faff] text-ink">
            <div className="relative flex min-h-screen flex-col lg:flex-row">
                {/* Background decoration */}
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-linear-to-br from-white via-[#f6f9ff] to-[#eef4ff]" />

                    {/* Dot grid, top left */}
                    <div
                        className="absolute left-0 top-0 h-72 w-56 opacity-60"
                        style={{
                            backgroundImage:
                                'radial-gradient(#b7cbf2 1.6px, transparent 1.6px)',
                            backgroundSize: '26px 26px',
                            maskImage:
                                'linear-gradient(135deg, black, transparent 75%)',
                            WebkitMaskImage:
                                'linear-gradient(135deg, black, transparent 75%)',
                        }}
                    />

                    {/* Soft diagonal wash, bottom left */}
                    <div className="absolute bottom-0 left-0 hidden h-[62%] w-[38%] bg-linear-to-tr from-brand-500/15 via-brand-300/10 to-transparent [clip-path:polygon(0_0,100%_100%,0_100%)] lg:block" />

                    {/* Solid corner triangle, bottom left */}
                    <div className="absolute bottom-0 left-0 hidden h-[27%] w-[13%] bg-linear-to-tr from-brand-600 to-brand-500 [clip-path:polygon(0_0,100%_100%,0_100%)] lg:block" />

                    <div className="absolute -bottom-40 right-0 h-96 w-96 rounded-full bg-brand-100/50 blur-3xl" />
                </div>

                {/* Left branding section */}
                <section className="relative flex w-full flex-col px-6 pb-4 pt-10 sm:px-12 lg:min-h-screen lg:w-[52%] lg:px-16 lg:pb-0 lg:pt-[15vh] xl:px-24">
                    <div className="stagger relative z-10 mx-auto w-full max-w-xl lg:mx-0">
                        <Link
                            href="/"
                            className="inline-flex items-center transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                        >
                            <img
                                src="/images/ccs-connect-logo.png"
                                alt="CCS Connect"
                                className="h-auto w-52 object-contain sm:w-60"
                            />
                        </Link>

                        <h1 className="mt-8 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.6rem] lg:leading-[1.05]">
                            {content.title}
                        </h1>

                        <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 sm:text-xl">
                            {content.description}
                        </p>

                        <div className="h-1 w-14 rounded-full bg-brand-600 lg:mt-8" />
                    </div>

                    <HeroIllustration />
                </section>

                {/* Right authentication section */}
                <section className="relative flex w-full items-center justify-center px-5 py-8 sm:px-8 lg:min-h-screen lg:w-[48%] lg:px-12">
                    <div className="relative z-10 w-full max-w-150 animate-fade-up rounded-3xl border border-white bg-white p-7 shadow-card sm:p-10 lg:p-12">
                        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                            {mode === 'register' ? (
                                <UserRound size={30} strokeWidth={1.7} />
                            ) : (
                                <AdminIcon size={32} />
                            )}
                        </div>

                        {children}

                        {/* Bottom security message */}
                        <div className="mt-8 flex items-center gap-4">
                            <div className="h-px flex-1 bg-slate-200" />

                            <span className="flex shrink-0 items-center justify-center text-brand-600">
                                {mode === 'register' ? (
                                    <FileText size={22} strokeWidth={1.6} />
                                ) : (
                                    <Shield size={22} strokeWidth={1.6} />
                                )}
                            </span>

                            <div className="h-px flex-1 bg-slate-200" />
                        </div>

                        <p className="mt-3 text-center text-sm text-slate-500">
                            {mode === 'register'
                                ? 'Create your secure CCS Connect account'
                                : 'Secure administrator access'}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}