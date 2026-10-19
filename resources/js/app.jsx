import '../css/app.css';

import { syncPresence } from '@/lib/presence';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'CCS Connect';

const initialPage = JSON.parse(
    document.getElementById('app').dataset.page
);

createInertiaApp({
    page: initialPage,

    title: (title) => `${title} - ${appName}`,

    // Each page is its own chunk, loaded on first visit.
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.jsx`,
            import.meta.glob('./pages/**/*.jsx'),
        ),

    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },

    // No top loading bar: layouts show a page skeleton instead (usePendingPage).
    progress: false,
});

// Real-time online status: joined while signed in, left on logout.
syncPresence(Boolean(initialPage.props.auth?.user));
router.on('navigate', (event) => syncPresence(Boolean(event.detail.page.props.auth?.user)));
