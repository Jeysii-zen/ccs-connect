import { useModalLayer } from '@/components/ui/modalLayer';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const sizes = {
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-3xl',
    '2xl': 'sm:max-w-4xl',
};

/**
 * Modern form/dialog window. A bottom sheet on phones, a centered card from
 * `sm` up; the header and footer stay put while the body scrolls.
 *
 * - onClose: called for Escape and backdrop clicks (unless `busy`).
 * - hidden: keeps the modal mounted but invisible (e.g. while an upload
 *   runs and only a progress toast should show).
 * - as: the panel element, e.g. "form" so the whole modal submits.
 */
export default function FormModal({
    onClose,
    labelledBy,
    size = 'lg',
    busy = false,
    hidden = false,
    zIndex = 'z-[100]',
    as: Panel = 'div',
    panelProps = {},
    children,
}) {
    const panelRef = useRef(null);

    useModalLayer(true, () => {
        if (!busy) onClose?.();
    });

    // Focus the first field so keyboard users can start typing.
    useEffect(() => {
        const field = panelRef.current?.querySelector(
            'input:not([type=hidden]):not([disabled]):not(.sr-only), textarea, select',
        );

        (field ?? panelRef.current)?.focus({ preventScroll: true });
    }, []);

    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            className={`fixed inset-0 ${zIndex} flex items-end justify-center transition-[background-color,backdrop-filter] duration-300 sm:items-center sm:p-6 ${
                hidden
                    ? 'pointer-events-auto cursor-progress bg-transparent delay-300'
                    : 'animate-overlay-in bg-[#020618]/45 backdrop-blur-[6px]'
            }`}
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onClose?.();
            }}
        >
            <Panel
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
                inert={hidden || undefined}
                {...panelProps}
                className={`relative flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(15,42,100,0.45)] outline-none ring-1 ring-slate-900/5 animate-sheet-in sm:max-h-[min(90dvh,880px)] sm:rounded-[28px] sm:animate-modal-in ${
                    sizes[size] ?? sizes.lg
                } ${hidden ? 'invisible opacity-0 transition-[opacity,visibility] delay-300 duration-300' : ''} ${
                    panelProps.className ?? ''
                }`}
            >
                {/* Brand accent: blue to teal with a restrained gold end. */}
                <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-blue-600 via-cyan-500 to-amber-300"
                />
                <span aria-hidden="true" className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-slate-200 sm:hidden" />
                {children}
            </Panel>
        </div>,
        document.body,
    );
}

export function ModalHeader({
    icon: Icon,
    eyebrow,
    title,
    titleId,
    description,
    onClose,
    closeDisabled = false,
    closeLabel = 'Close',
    children,
}) {
    return (
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-100 bg-gradient-to-br from-blue-50/70 via-white to-cyan-50/50 px-5 pb-4 pt-4 sm:gap-4 sm:px-7 sm:pb-5 sm:pt-6">
            {Icon && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/25">
                    <Icon size={20} />
                </div>
            )}

            <div className="min-w-0 flex-1">
                {eyebrow && (
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
                )}
                <h2 id={titleId} className="mt-0.5 break-words text-lg font-bold leading-snug text-slate-950 sm:text-xl">
                    {title}
                </h2>
                {description && <div className="mt-1 text-sm leading-6 text-slate-500">{description}</div>}
                {children}
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    disabled={closeDisabled}
                    aria-label={closeLabel}
                    className="-mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700 hover:shadow-sm disabled:opacity-50"
                >
                    <X size={20} />
                </button>
            )}
        </div>
    );
}

export function ModalBody({ className = '', children }) {
    return (
        <div className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 [scrollbar-width:thin] sm:px-7 sm:py-6 ${className}`}>
            {children}
        </div>
    );
}

export function ModalFooter({ className = '', children }) {
    return (
        <div
            className={`shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-7 sm:pb-4 ${className}`}
        >
            {children}
        </div>
    );
}
