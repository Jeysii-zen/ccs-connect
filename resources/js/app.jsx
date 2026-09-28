import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'CCS Connect';

const initialPage = JSON.parse(
    document.getElementById('app').dataset.page
);

console.log('=== CCS CONNECT INERTIA PAGE TEST ===');
console.log('Initial page:', initialPage);
console.log('Initial component:', initialPage.component);

createInertiaApp({
    page: initialPage,

    title: (title) => `${title} - ${appName}`,

    resolve: (name) => {
        console.log('RESOLVE CALLED:', name);

        return resolvePageComponent(
            `./pages/${name}.jsx`,
            import.meta.glob('./pages/**/*.jsx'),
        );
    },

    setup({ el, App, props }) {
        console.log('INERTIA SETUP CALLED');
        console.log('Props:', props);

        const root = createRoot(el);

        root.render(<App {...props} />);
    },

    progress: {
        color: '#2563EB',
    },
});