export default function SectionHeading({
    icon: Icon,
    title,
    subtitle,
    action,
}) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <Icon size={19} strokeWidth={2.1} />
                </div>

                <div className="min-w-0">
                    <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                        {title}
                    </h2>

                    {subtitle && (
                        <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>

            {action}
        </div>
    );
}