import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

const DELAY_MS = 200;

/**
 * The path of the page being loaded, or null. Only full page visits count:
 * filters, pagination, polling and form posts keep the page mounted (same
 * rule as AdminConnectLayout). Shown only after DELAY_MS so fast loads never
 * flash a skeleton.
 */
export default function usePendingPage() {
    const [pending, setPending] = useState(null);
    const visitRef = useRef(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const offStart = router.on('start', (event) => {
            const visit = event.detail.visit;

            if (visit.method !== 'get' || visit.preserveState || visit.only?.length > 0 || visit.prefetch) {
                return;
            }

            visitRef.current = visit;
            window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => {
                if (visitRef.current === visit) setPending(new URL(visit.url).pathname);
            }, DELAY_MS);
        });

        const offFinish = router.on('finish', (event) => {
            if (event.detail.visit !== visitRef.current) return;

            visitRef.current = null;
            window.clearTimeout(timerRef.current);
            setPending(null);
        });

        return () => {
            offStart();
            offFinish();
            window.clearTimeout(timerRef.current);
        };
    }, []);

    return pending;
}
