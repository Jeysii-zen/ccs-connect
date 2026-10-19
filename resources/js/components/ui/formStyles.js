// Shared look for fields inside form modals: soft filled inputs that turn
// white with a blue focus ring.
export const fieldClass =
    'mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)] outline-none transition duration-200 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60';

export const labelClass = 'text-sm font-semibold text-slate-700';

export const fieldErrorClass = 'border-red-300 bg-red-50/40 focus:border-red-500 focus:ring-red-100';

// Modal action buttons; the footer stacks them full width on phones.
export const primaryButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:from-blue-700 hover:to-cyan-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5';

export const secondaryButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5';

export const ghostButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5';

export const dangerButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/25 transition hover:from-red-600 hover:to-rose-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5';
