import { useSyncExternalStore } from 'react';

/**
 * Real-time online status over Laravel Reverb. Every signed-in page joins
 * the "online" presence channel; Reverb drops the member when the user's
 * last tab closes or they log out. Members are opaque keys
 * (User::getAuthIdentifierForBroadcasting), matched on the Accounts page.
 *
 * `live` is false until the channel is joined (or when Reverb is down), so
 * callers can fall back to last_seen_at.
 */

let echo = null;
let joined = false;
let state = { live: false, members: new Set() };
const listeners = new Set();

function publish(next) {
    state = next;
    listeners.forEach((listener) => listener());
}

function xsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/);

    return match ? decodeURIComponent(match[1]) : '';
}

// Echo and the Pusher client load only for signed-in users (own chunk).
async function client() {
    if (echo) return echo;

    const [{ default: Echo }, { default: Pusher }] = await Promise.all([import('laravel-echo'), import('pusher-js')]);
    const scheme = import.meta.env.VITE_REVERB_SCHEME ?? 'https';

    echo = new Echo({
        broadcaster: 'reverb',
        Pusher,
        key: import.meta.env.VITE_REVERB_APP_KEY,
        wsHost: import.meta.env.VITE_REVERB_HOST,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 80),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 443),
        forceTLS: scheme === 'https',
        enabledTransports: ['ws', 'wss'],
        // Read the CSRF token at auth time: Inertia keeps the page open
        // across login, when the session (and token) change.
        authorizer: (channel) => ({
            authorize: (socketId, callback) => {
                fetch('/broadcasting/auth', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-XSRF-TOKEN': xsrfToken(),
                    },
                    body: JSON.stringify({ socket_id: socketId, channel_name: channel.name }),
                })
                    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`auth ${response.status}`))))
                    .then((data) => callback(null, data))
                    .catch((error) => callback(error, null));
            },
        }),
    });

    // Lost connection: statuses are unknown until we rejoin.
    echo.connector.pusher.connection.bind('state_change', ({ current }) => {
        if (current !== 'connected' && state.live) publish({ live: false, members: new Set() });
    });

    return echo;
}

/**
 * Join while signed in, leave on logout. Called on every Inertia page.
 */
export async function syncPresence(signedIn) {
    if (!import.meta.env.VITE_REVERB_APP_KEY) return;

    if (signedIn && !joined) {
        joined = true;
        (await client())
            .join('online')
            .here((members) => publish({ live: true, members: new Set(members.map((member) => member.key)) }))
            .joining((member) => publish({ live: true, members: new Set(state.members).add(member.key) }))
            .leaving((member) => {
                const members = new Set(state.members);
                members.delete(member.key);
                publish({ live: true, members });
            })
            .error(() => publish({ live: false, members: new Set() }));
    } else if (!signedIn && joined) {
        joined = false;
        echo?.leave('online');
        publish({ live: false, members: new Set() });
    }
}

function subscribe(listener) {
    listeners.add(listener);

    return () => listeners.delete(listener);
}

export function usePresence() {
    return useSyncExternalStore(subscribe, () => state);
}
