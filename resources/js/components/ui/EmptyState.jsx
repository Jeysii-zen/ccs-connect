export default function EmptyState({ icon: Icon, title, description }) {
    return (
        <div className="flex min-h-[170px] flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 transition duration-300 hover:scale-105">
                <Icon size={21} />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">
                {title}
            </h3>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 sm:text-sm">
                {description}
            </p>
        </div>
    );
}