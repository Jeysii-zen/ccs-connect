import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

export default function Dashboard({ student }) {
    const fullName = `${student.first_name} ${student.last_name}`.trim();

    return (
        <AuthenticatedLayout
            header={
                <div>
                    <p className="text-sm font-medium text-blue-600">
                        CCS CONNECT
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold leading-tight text-gray-800">
                        Student Dashboard
                    </h2>
                </div>
            }
        >
            <Head title="Student Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                        <div className="border-b border-gray-100 p-6">
                            <p className="text-sm font-medium text-gray-500">
                                Welcome back
                            </p>

                            <h1 className="mt-1 text-2xl font-bold text-gray-900">
                                {fullName}
                            </h1>

                            <p className="mt-2 text-sm text-gray-500">
                                Here is your CCS Connect account information.
                            </p>
                        </div>

                        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
                            <div className="rounded-lg border border-gray-200 p-5">
                                <p className="text-sm font-medium text-gray-500">
                                    Email
                                </p>
                                <p className="mt-2 break-words font-semibold text-gray-900">
                                    {student.email}
                                </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-5">
                                <p className="text-sm font-medium text-gray-500">
                                    Year Level
                                </p>
                                <p className="mt-2 font-semibold text-gray-900">
                                    {student.year_level || 'Not provided'}
                                </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-5">
                                <p className="text-sm font-medium text-gray-500">
                                    Block Number
                                </p>
                                <p className="mt-2 font-semibold text-gray-900">
                                    {student.block_number || 'Not provided'}
                                </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-5">
                                <p className="text-sm font-medium text-gray-500">
                                    Role
                                </p>
                                <p className="mt-2 font-semibold capitalize text-gray-900">
                                    {student.role}
                                </p>
                            </div>

                            <div className="rounded-lg border border-gray-200 p-5">
                                <p className="text-sm font-medium text-gray-500">
                                    Account Status
                                </p>
                                <p className="mt-2 font-semibold capitalize text-gray-900">
                                    {student.account_status
                                        ?.replaceAll('_', ' ')
                                        .toLowerCase()}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Announcements
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Announcements will be available here in a
                                future CCS Connect module.
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Events
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Upcoming CCS events and registration features
                                will be added in a future module.
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-6 shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Campus Navigation
                            </h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Campus navigation features will be added in a
                                future module.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
