import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Page notification in the lower-right corner, styled like the Account
 * page's notification. Rendered into <body> so no page container clips it.
 *
 * notification: { type: 'success' | 'error', message, title? } or null.
 * It dismisses itself after `duration` ms (0 keeps it until closed).
 */
export default function Toast({ notification, onClose, duration = 5000 }) {
    // A ref, so a new onClose function on every render does not restart
    // the timer.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!notification || !duration) return undefined;

        const timeout = window.setTimeout(() => onCloseRef.current(), duration);

        return () => window.clearTimeout(timeout);
    }, [notification, duration]);

    if (!notification || typeof document === 'undefined') return null;

    const success = notification.type === 'success';

    return createPortal(
        <div className="pointer-events-none fixed bottom-6 right-6 z-[150] w-[calc(100%-3rem)] max-w-md">
            <div
                role={success ? 'status' : 'alert'}
                aria-live={success ? 'polite' : 'assertive'}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-xl ${
                    success ? 'border-emerald-200' : 'border-red-200'
                }`}
            >
                <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        success ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}
                >
                    {success ? <CheckCircle2 size={19} /> : <AlertCircle size={19} />}
                </div>

                <div className="min-w-0 flex-1">
                    {notification.title && (
                        <p className={`text-sm font-semibold ${success ? 'text-emerald-800' : 'text-red-800'}`}>
                            {notification.title}
                        </p>
                    )}
                    <p
                        className={
                            notification.title
                                ? 'mt-1 text-sm leading-5 text-slate-600'
                                : `text-sm font-medium leading-5 ${success ? 'text-emerald-800' : 'text-red-800'}`
                        }
                    >
                        {notification.message}
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => onCloseRef.current()}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Dismiss notification"
                >
                    <X size={16} />
                </button>
            </div>
        </div>,
        document.body,
    );
}
