import { CalendarClock, CalendarDays, Clock } from 'lucide-react';
import { useRef } from 'react';

const icons = {
    date: CalendarDays,
    time: Clock,
    'datetime-local': CalendarClock,
};

/**
 * Native date/time input where the whole box opens the picker, not just
 * the browser's small icon. Typing into the date/time segments still works;
 * Space also opens the picker for keyboard users. Values and validation
 * are the native input's, so forms need no changes.
 *
 * Accepts every <input> prop; `className` styles the box (a leading mt-*
 * margin is moved to the wrapper so the icon stays centred).
 */
export default function DateTimeInput({ type = 'date', className = '', onClick, onKeyDown, ...props }) {
    const inputRef = useRef(null);
    const Icon = icons[type] ?? CalendarDays;

    const margin = className.match(/(?:^|\s)(mt-[\w.[\]-]+)/)?.[1] ?? '';
    const inputClass = className.replace(margin, '').trim();

    const openPicker = () => {
        const input = inputRef.current;

        if (!input || input.disabled || input.readOnly) return;

        try {
            input.showPicker?.();
        } catch {
            // Unsupported browser or not allowed here: the field still
            // works by typing, and mobile browsers open their own picker.
        }
    };

    return (
        <div className={`group relative ${margin}`}>
            <input
                ref={inputRef}
                type={type}
                {...props}
                onClick={(event) => {
                    onClick?.(event);
                    openPicker();
                }}
                onKeyDown={(event) => {
                    onKeyDown?.(event);

                    if (event.key === ' ' && !event.defaultPrevented) {
                        event.preventDefault();
                        openPicker();
                    }
                }}
                className={`${inputClass} cursor-pointer pl-11 tabular-nums disabled:cursor-not-allowed [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-datetime-edit]:cursor-pointer`}
            />
            <Icon
                size={18}
                aria-hidden="true"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 transition group-focus-within:text-blue-600 group-hover:text-blue-600"
            />
        </div>
    );
}
