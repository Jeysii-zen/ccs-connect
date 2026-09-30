export default function StatCard({
    icon: Icon,
    label,
    value,
    description,
    status,
}) {
    return (
        <div className="group relative overflow-hidden rounded-2xl border border-white/50 bg-white/20 p-4 shadow-[0_8px_24px_rgba(30,80,160,0.10),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:bg-white/40 hover:shadow-[0_16px_36px_rgba(37,99,235,0.22),inset_0_1px_0_rgba(255,255,255,0.9)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
            <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-blue-400/0 blur-2xl transition-colors duration-500 group-hover:bg-blue-400/30" />

            <div className="relative flex items-center gap-2 text-blue-600">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/10 transition duration-300 group-hover:bg-blue-600 group-hover:text-white">
                    <Icon size={15} />
                </span>

                <span className="text-[11px] font-bold uppercase tracking-wide">
                    {label}
                </span>
            </div>

            <p
                className={`mt-3 truncate text-sm font-extrabold ${
                    status ? 'text-emerald-700' : 'text-blue-950'
                }`}
            >
                {value}
            </p>

            <p className="mt-1 text-[10px] leading-4 text-slate-500">
                {description}
            </p>
        </div>
    );
}



