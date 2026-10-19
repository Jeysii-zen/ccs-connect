import { skeletonFor } from '@/lib/skeletonFor';

/**
 * Placeholder shaped like the page being loaded (see usePendingPage), shown
 * in a layout's content area while the next page loads.
 */

const Block = ({ className = '' }) => <div className={`rounded-xl bg-slate-200/80 ${className}`} />;

const Card = ({ className = '', children }) => (
    <div className={`rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>{children}</div>
);

function Heading() {
    return (
        <div className="space-y-3 pt-4 sm:pt-6">
            <Block className="h-3 w-24" />
            <Block className="h-8 w-64 max-w-full" />
            <Block className="h-4 w-96 max-w-full" />
        </div>
    );
}

function Cards() {
    return (
        <>
            <Heading />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((card) => (
                    <Card key={card} className="overflow-hidden p-0">
                        <Block className="h-44 rounded-none" />
                        <div className="space-y-3 p-5">
                            <Block className="h-5 w-20 rounded-full" />
                            <Block className="h-5 w-4/5" />
                            <Block className="h-4 w-3/5" />
                            <Block className="h-4 w-2/5" />
                        </div>
                    </Card>
                ))}
            </div>
        </>
    );
}

function Table() {
    return (
        <>
            <Heading />
            <Card className="mt-6 p-0">
                <div className="flex gap-2 border-b border-slate-100 p-4 sm:p-5">
                    {[0, 1, 2, 3].map((tab) => (
                        <Block key={tab} className="h-9 w-24" />
                    ))}
                </div>
                <div className="divide-y divide-slate-100">
                    {[0, 1, 2, 3, 4, 5].map((row) => (
                        <div key={row} className="flex items-center gap-4 px-5 py-4">
                            <Block className="h-10 w-10 shrink-0 rounded-2xl" />
                            <div className="flex-1 space-y-2">
                                <Block className="h-4 w-1/3" />
                                <Block className="h-3 w-1/4" />
                            </div>
                            <Block className="hidden h-6 w-20 rounded-full sm:block" />
                        </div>
                    ))}
                </div>
            </Card>
        </>
    );
}

function Detail() {
    return (
        <Card className="mt-4 overflow-hidden p-0">
            <Block className="h-64 rounded-none sm:h-80" />
            <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="space-y-3">
                    <Block className="h-5 w-20 rounded-full" />
                    <Block className="h-8 w-3/4" />
                    <Block className="h-4 w-full" />
                    <Block className="h-4 w-11/12" />
                    <Block className="h-4 w-2/3" />
                </div>
                <div className="space-y-3 rounded-2xl bg-slate-50 p-5">
                    <Block className="h-4 w-2/3" />
                    <Block className="h-4 w-1/2" />
                    <Block className="h-11 w-full rounded-2xl" />
                </div>
            </div>
        </Card>
    );
}

function Dashboard() {
    return (
        <>
            <Block className="mt-4 h-48 rounded-[30px]" />
            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                {[0, 1, 2, 3].map((stat) => (
                    <Card key={stat} className="space-y-3">
                        <Block className="h-10 w-10 rounded-2xl" />
                        <Block className="h-6 w-16" />
                        <Block className="h-3 w-24" />
                    </Card>
                ))}
            </div>
        </>
    );
}

function Form() {
    return (
        <>
            <Heading />
            {[0, 1].map((section) => (
                <Card key={section} className="mt-6 max-w-3xl space-y-5 sm:p-8">
                    <Block className="h-5 w-40" />
                    {[0, 1].map((field) => (
                        <div key={field} className="space-y-2">
                            <Block className="h-3 w-28" />
                            <Block className="h-11 w-full rounded-2xl" />
                        </div>
                    ))}
                    <Block className="h-10 w-32 rounded-2xl" />
                </Card>
            ))}
        </>
    );
}

const VARIANTS = { cards: Cards, table: Table, detail: Detail, dashboard: Dashboard, form: Form };

export default function PageSkeleton({ path }) {
    const Variant = VARIANTS[skeletonFor(path)];

    return (
        <div role="status" aria-live="polite" aria-label="Loading page" className="animate-pulse">
            <Variant />
        </div>
    );
}
