import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Light/dark switch. The choice is saved in the "appearance" cookie, which
 * app.blade.php reads to apply the theme before the first paint (no flash).
 * Without a saved choice the system setting is used.
 */
export default function ThemeToggle({ className = '' }) {
    const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

    const toggle = () => {
        const next = !dark;

        document.documentElement.classList.toggle('dark', next);
        document.cookie = `appearance=${next ? 'dark' : 'light'}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
        setDark(next);
    };

    const Icon = dark ? Sun : Moon;

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={dark ? 'Light mode' : 'Dark mode'}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${className}`}
        >
            <Icon size={19} aria-hidden="true" />
        </button>
    );
}
