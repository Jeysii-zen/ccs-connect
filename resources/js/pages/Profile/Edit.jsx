import Toast from '@/components/ui/Toast';
import CCSConnectLayout from '@/layouts/CCSConnectLayout';
import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import DeactivateAccountNotice from './Partials/DeactivateAccountNotice';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit() {
    const success = usePage().props.flash?.success;
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (success) setNotification({ type: 'success', message: success });
    }, [success]);

    return (
        <CCSConnectLayout>
            <Head title="Profile" />

            <div className="mx-auto max-w-5xl py-4 sm:py-6">
                <div className="mb-6">
                    <p className="text-sm font-medium text-blue-600">
                        Account Settings
                    </p>

                    <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                        Profile
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        Manage your email, profile picture, password, and account
                        settings.
                    </p>
                </div>

                <div className="space-y-5">
                    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
                        <UpdateProfileInformationForm className="max-w-2xl"/>
                    </section>

                    <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-7">
                        <UpdatePasswordForm className="max-w-2xl" />
                    </section>

                    <section className="rounded-3xl border border-red-100 bg-white p-5 shadow-sm sm:p-7">
                        <DeactivateAccountNotice className="max-w-2xl" />
                    </section>
                </div>
            </div>

            <Toast notification={notification} onClose={() => setNotification(null)} />
        </CCSConnectLayout>
    );
}
