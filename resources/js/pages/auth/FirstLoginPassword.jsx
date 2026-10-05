import { Head, useForm } from '@inertiajs/react';

export default function FirstLoginPassword() {
    const { data, setData, put, processing, errors } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (event) => {
        event.preventDefault();

        put(route('password.first-login.update'));
    };

    return (
        <>
            <Head title="Change Temporary Password" />

            <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-10">
                <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">
                            Change Your Password
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            You are using a temporary password. Please create a
                            new password before continuing to CCS Connect.
                        </p>
                    </div>

                    <form onSubmit={submit} className="mt-6 space-y-5">
                        <div>
                            <label
                                htmlFor="current_password"
                                className="block text-sm font-medium text-slate-700"
                            >
                                Temporary Password
                            </label>

                            <input
                                id="current_password"
                                type="password"
                                value={data.current_password}
                                onChange={(event) =>
                                    setData(
                                        'current_password',
                                        event.target.value
                                    )
                                }
                                className="mt-2 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="current-password"
                            />

                            {errors.current_password && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.current_password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-slate-700"
                            >
                                New Password
                            </label>

                            <input
                                id="password"
                                type="password"
                                value={data.password}
                                onChange={(event) =>
                                    setData('password', event.target.value)
                                }
                                className="mt-2 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="new-password"
                            />

                            {errors.password && (
                                <p className="mt-1 text-sm text-red-600">
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="password_confirmation"
                                className="block text-sm font-medium text-slate-700"
                            >
                                Confirm New Password
                            </label>

                            <input
                                id="password_confirmation"
                                type="password"
                                value={data.password_confirmation}
                                onChange={(event) =>
                                    setData(
                                        'password_confirmation',
                                        event.target.value
                                    )
                                }
                                className="mt-2 block w-full rounded-xl border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                autoComplete="new-password"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {processing
                                ? 'Updating Password...'
                                : 'Update Password'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}