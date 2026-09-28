import GuestLayout, {
    AuthButton,
    AuthInput,
    AuthPasswordInput,
} from '@/layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import {
    CheckCircle2,
    LockKeyhole,
    Mail,
    UserPlus,
    UserRound,
} from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout mode="register">
            <Head title="Create Student Account" />

            <div className="stagger">
                {/* Header */}
                <div className="mb-7">
                    <h2 className="text-[2rem] font-bold leading-tight tracking-tight text-ink">
                        Create Student Account
                    </h2>

                    <p className="mt-1.5 text-base leading-6 text-slate-500">
                        Register your account to access CCS Connect services
                    </p>
                </div>

                <form onSubmit={submit} className="stagger space-y-5">
                    {/* First Name + Last Name */}
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <AuthInput
                            id="first_name"
                            type="text"
                            label="First Name"
                            icon={UserRound}
                            value={data.first_name}
                            error={errors.first_name}
                            autoComplete="given-name"
                            autoFocus
                            placeholder="First name"
                            onChange={(e) =>
                                setData('first_name', e.target.value)
                            }
                        />

                        <AuthInput
                            id="last_name"
                            type="text"
                            label="Last Name"
                            icon={UserRound}
                            value={data.last_name}
                            error={errors.last_name}
                            autoComplete="family-name"
                            placeholder="Last name"
                            onChange={(e) =>
                                setData('last_name', e.target.value)
                            }
                        />
                    </div>

                    <AuthInput
                        id="email"
                        type="email"
                        label="Email Address"
                        icon={Mail}
                        value={data.email}
                        error={errors.email}
                        autoComplete="email"
                        placeholder="Enter your email address"
                        onChange={(e) => setData('email', e.target.value)}
                    />

                    <AuthPasswordInput
                        id="password"
                        label="Password"
                        icon={LockKeyhole}
                        value={data.password}
                        error={errors.password}
                        autoComplete="new-password"
                        placeholder="Create a password"
                        onChange={(e) => setData('password', e.target.value)}
                    />

                    <AuthPasswordInput
                        id="password_confirmation"
                        label="Confirm Password"
                        icon={LockKeyhole}
                        value={data.password_confirmation}
                        error={errors.password_confirmation}
                        autoComplete="new-password"
                        placeholder="Confirm your password"
                        onChange={(e) =>
                            setData('password_confirmation', e.target.value)
                        }
                    />

                    {/* Account notice */}
                    <div className="flex gap-3 rounded-xl border border-brand-100 bg-brand-50/60 p-4">
                        <CheckCircle2
                            aria-hidden="true"
                            size={20}
                            className="mt-0.5 shrink-0 text-brand-600"
                        />

                        <p className="text-sm leading-5 text-slate-600">
                            Your account will be created as a{' '}
                            <span className="font-semibold text-ink">
                                Student
                            </span>
                            . Make sure your information is correct before
                            continuing.
                        </p>
                    </div>

                    <AuthButton
                        processing={processing}
                        icon={UserPlus}
                        loadingText="Creating Account..."
                    >
                        Create Account
                    </AuthButton>
                </form>

                {/* Login link */}
                <div className="mt-7 text-center">
                    <span className="text-sm text-slate-500">
                        Already have an account?{' '}
                    </span>

                    <Link
                        href={route('login')}
                        className="rounded text-sm font-semibold text-brand-600 transition hover:text-brand-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/40"
                    >
                        Sign In
                    </Link>
                </div>
            </div>
        </GuestLayout>
    );
}