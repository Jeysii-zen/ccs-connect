import GuestLayout, {
    AuthButton,
    AuthInput,
    AuthPasswordInput,
} from '@/layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { LogIn, LockKeyhole, Mail } from 'lucide-react';

export default function Login({ status, canResetPassword }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        login_identifier: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('login_identifier', 'password'),
        });
    };

    return (
        <GuestLayout mode="login">
            <Head title="Login" />

            <div className="stagger">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-[2rem] font-bold leading-tight tracking-tight text-ink">
                        Welcome Back!
                    </h2>

                    <p className="mt-1.5 text-base text-slate-500">
                        Sign in to your CCS Connect account
                    </p>
                </div>

                {/* Status message */}
                {status && (
                    <div
                        role="status"
                        className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
                    >
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="stagger space-y-5">
                    <AuthInput
                        id="login_identifier"
                        type="text"
                        label="Email / ID Number"
                        icon={Mail}
                        value={data.login_identifier}
                        error={errors.login_identifier ?? errors.email}
                        autoComplete="username"
                        autoFocus
                        placeholder="Enter your email or ID number"
                        onChange={(e) =>
                            setData('login_identifier', e.target.value)
                        }
                    />

                    <AuthPasswordInput
                        id="password"
                        label="Password"
                        icon={LockKeyhole}
                        value={data.password}
                        error={errors.password}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    {/* Remember + Forgot password */}
                    <div className="flex items-center justify-between gap-4 pt-1">
                        <label className="flex cursor-pointer items-center">
                            <input
                                type="checkbox"
                                name="remember"
                                checked={data.remember}
                                onChange={(e) =>
                                    setData('remember', e.target.checked)
                                }
                                className="h-5 w-5 cursor-pointer rounded border-slate-300 accent-brand-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40 focus-visible:ring-offset-2"
                            />

                            <span className="ms-3 text-sm font-medium text-slate-700">
                                Remember me
                            </span>
                        </label>

                        {canResetPassword && (
                            <Link
                                href={route('password.request')}
                                className="rounded text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                            >
                                Forgot Password?
                            </Link>
                        )}
                    </div>

                    <AuthButton
                        processing={processing}
                        icon={LogIn}
                        loadingText="Signing In..."
                    >
                        Sign In
                    </AuthButton>
                </form>

            </div>
        </GuestLayout>
    );
}