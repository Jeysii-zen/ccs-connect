import { Head } from '@inertiajs/react';

export default function Index() {
    return (
        <>
            <Head title="Account Management" />

            <div className="min-h-screen bg-slate-50 px-6 py-8">
                <div className="mx-auto max-w-7xl">
                    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <h1 className="text-2xl font-bold text-slate-900">
                            Account Management
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                            Manage CCS Connect user accounts.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
