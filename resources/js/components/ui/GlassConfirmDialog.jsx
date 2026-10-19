import { useModalLayer } from '@/components/ui/modalLayer';
import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EXIT_MS = 280;
const smoothEase = 'cubic-bezier(0.22, 1, 0.36, 1)';

// Frosted secondary button for use on the glass panel.
export const glassButtonClass =
    'inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/70 bg-white/50 px-5 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/80 focus:outline-none focus:ring-4 focus:ring-white/70 active:translate-y-0 active:scale-95 disabled:opacity-50';

const tones = {
    danger: {
        tile: 'text-red-600 ring-red-200/70 shadow-[0_10px_30px_-6px_rgba(239,68,68,0.55)]',
        pulse: 'bg-red-400/40',
        button: 'from-red-600 to-rose-500 shadow-[0_10px_30px_-8px_rgba(239,68,68,0.7)] focus:ring-red-200',
    },
    success: {
        tile: 'text-emerald-600 ring-emerald-200/70 shadow-[0_10px_30px_-6px_rgba(16,185,129,0.55)]',
        pulse: 'bg-emerald-400/40',
        button: 'from-emerald-600 to-teal-500 shadow-[0_10px_30px_-8px_rgba(16,185,129,0.7)] focus:ring-emerald-200',
    },
    primary: {
        tile: 'text-blue-600 ring-blue-200/70 shadow-[0_10px_30px_-6px_rgba(37,99,235,0.5)]',
        pulse: 'bg-blue-400/40',
        button: 'from-blue-600 to-cyan-500 shadow-[0_10px_30px_-8px_rgba(37,99,235,0.65)] focus:ring-blue-200',
    },
};

/**
 * Glassmorphism confirmation (the Account page's design, shared): a frosted
 * card over a blurred page. Keeps its last content while fading out, so
 * callers may clear their state as soon as it closes.
 *
 * `actions` replaces the Cancel/Confirm pair (e.g. for three choices);
 * `hideCancel` leaves a single button for plain notices.
 */
export default function GlassConfirmDialog(props) {
    const { open } = props;
    const last = useRef(props);
    const [mounted, setMounted] = useState(open);
    const [visible, setVisible] = useState(false);

    if (open) last.current = props;

    useEffect(() => {
        if (open) {
            setMounted(true);
            const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));

            return () => cancelAnimationFrame(frame);
        }

        setVisible(false);
        const timeout = window.setTimeout(() => setMounted(false), EXIT_MS);

        return () => window.clearTimeout(timeout);
    }, [open]);

    const {
        icon: Icon,
        title,
        children,
        confirmLabel = 'Confirm',
        processingLabel = 'Please wait…',
        cancelLabel = 'Cancel',
        hideCancel = false,
        actions,
        tone = 'primary',
        processing = false,
        onCancel,
        onConfirm,
    } = open ? props : last.current;

    useModalLayer(open, () => {
        if (!processing) onCancel?.();
    });

    if (!mounted || typeof document === 'undefined') return null;

    const style = tones[tone] ?? tones.primary;
    const transition = { transitionDuration: `${EXIT_MS}ms`, transitionTimingFunction: smoothEase };

    return createPortal(
        <div
            className={`fixed inset-0 z-[130] flex items-center justify-center bg-[#0f172b]/35 p-4 backdrop-blur-md transition-opacity ${
                visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            style={transition}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !processing) onCancel?.();
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="glass-confirm-title"
                aria-describedby="glass-confirm-body"
                className={`relative w-full max-w-sm transition-all ${
                    visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.97] opacity-0'
                }`}
                style={transition}
            >
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
                        disabled={processing}
                        aria-label="Close"
                        className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-slate-500 transition hover:bg-white/70 hover:text-slate-800 disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>

                    <div className="relative px-6 pb-6 pt-9 text-center sm:px-7">
                        {Icon && (
                            <div className="relative mx-auto h-16 w-16">
                                <span className={`animate-glass-ring absolute inset-0 rounded-2xl ${style.pulse}`} />
                                <div
                                    className={`relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/80 bg-white/70 ring-1 backdrop-blur-xl ${style.tile}`}
                                >
                                    <Icon size={26} />
                                </div>
                            </div>
                        )}

                        <h2 id="glass-confirm-title" className="mt-5 text-xl font-bold tracking-tight text-slate-950">
                            {title}
                        </h2>

                        <div id="glass-confirm-body" className="mx-auto mt-2 max-w-[19rem] text-sm leading-6 text-slate-600">
                            {children}
                        </div>

                        {actions ?? (
                            <div className={`mt-6 grid gap-3 ${hideCancel ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {!hideCancel && (
                                    <button
                                        type="button"
                                        autoFocus
                                        disabled={processing}
                                        onClick={onCancel}
                                        className={glassButtonClass}
                                    >
                                        {cancelLabel}
                                    </button>
                                )}

                                <button
                                    type="button"
                                    autoFocus={hideCancel}
                                    disabled={processing}
                                    onClick={onConfirm}
                                    className={`relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br px-4 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-4 active:translate-y-0 active:scale-95 disabled:pointer-events-none disabled:opacity-70 ${style.button}`}
                                >
                                    <span
                                        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent"
                                        aria-hidden="true"
                                    />
                                    {processing && (
                                        <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    )}
                                    <span className="relative">{processing ? processingLabel : confirmLabel}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
