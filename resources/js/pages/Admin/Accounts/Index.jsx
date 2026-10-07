import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import { Head, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    Clipboard,
    GraduationCap,
    Mail,
    ShieldCheck,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useState } from 'react';

const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const labelClass = 'text-sm font-semibold text-slate-700';

function FieldError({ message }) {
    if (!message) {
        return null;
    }

    return (
        <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>
    );
}

function FormField({
    label,
    name,
    id,
    value,
    onChange,
    error,
    type = 'text',
    placeholder,
    required = false,
}) {
    const fieldId = id ?? name;

    return (
        <div>
            <label htmlFor={fieldId} className={labelClass}>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>

            <input
                id={fieldId}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`${inputClass} ${
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : ''
                }`}
            />

            <FieldError message={error} />
        </div>
    );
}

function SelectField({
    label,
    name,
    id,
    value,
    onChange,
    error,
    options,
    placeholder,
    required = false,
}) {
    const fieldId = id ?? name;

    return (
        <div>
            <label htmlFor={fieldId} className={labelClass}>
                {label}
                {required && <span className="ml-1 text-red-500">*</span>}
            </label>

            <select
                id={fieldId}
                name={name}
                value={value}
                onChange={onChange}
                className={`${inputClass} ${
                    error
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-100'
                        : ''
                }`}
            >
                <option value="">{placeholder}</option>

                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>

            <FieldError message={error} />
        </div>
    );
}

function AccountCreationCard({
    title,
    description,
    icon: Icon,
    badge,
    badgeClass,
    children,
    onSubmit,
    processing,
    submitLabel,
}) {
    return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/70 px-6 py-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                            <Icon size={22} />
                        </div>

                        <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-950">
                                    {title}
                                </h2>

                                <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${badgeClass}`}
                                >
                                    {badge}
                                </span>
                            </div>

                            <p className="max-w-xl text-sm leading-6 text-slate-500">
                                {description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={onSubmit} className="p-6">
                {children}

                <div className="mt-7 flex items-center justify-between gap-4 border-t border-slate-100 pt-5">
                    <p className="hidden text-xs text-slate-400 sm:block">
                        Fields marked with <span className="text-red-500">*</span>{' '}
                        are required.
                    </p>

                    <button
                        type="submit"
                        disabled={processing}
                        className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <UserPlus size={17} />

                        {processing ? 'Creating...' : submitLabel}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default function Index() {
    const { flash = {} } = usePage().props;

    const [showPasswordModal, setShowPasswordModal] = useState(
        Boolean(flash.account_creation),
    );

    const studentForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        student_number: '',
        year_level: '',
        block_number: '',
        email: '',
    });

    const facultyForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        email: '',
        employment_type: '',
    });

    const temporaryPassword =
        flash.account_creation?.temporary_password ?? '';

    const createdAccountType = flash.account_creation?.type ?? '';

    const handleStudentSubmit = (event) => {
        event.preventDefault();

        studentForm.post(route('admin.accounts.students.store'), {
            preserveScroll: true,
            onSuccess: () => {
                studentForm.reset();
            },
        });
    };

    const handleFacultySubmit = (event) => {
        event.preventDefault();

        facultyForm.post(route('admin.accounts.faculty.store'), {
            preserveScroll: true,
            onSuccess: () => {
                facultyForm.reset();
            },
        });
    };

    const copyTemporaryPassword = async () => {
        if (!temporaryPassword) {
            return;
        }

        await navigator.clipboard.writeText(temporaryPassword);
    };

    const closePasswordModal = () => {
        setShowPasswordModal(false);
    };

    return (
        <AdminConnectLayout>
            <Head title="Account Management" />

            <div className="mx-auto max-w-7xl py-2">
                {/* Page Header */}
                <div className="mb-7">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
                                <ShieldCheck size={14} />
                                Administrator
                            </div>

                            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Account Management
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                                Create and manage CCS Connect accounts for
                                students and faculty members using their
                                official account information.
                            </p>
                        </div>

                        <div className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm xl:w-auto">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <Users size={19} />
                            </div>

                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                                    Account Types
                                </p>

                                <p className="mt-0.5 text-sm font-bold text-slate-800">
                                    Student & Faculty
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Creation Information */}
                <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-start">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                        <ShieldCheck size={19} />
                    </div>

                    <div>
                        <h2 className="text-sm font-bold text-slate-900">
                            Admin-created accounts are automatically approved
                        </h2>

                        <p className="mt-1 text-xs leading-5 text-slate-600">
                            A secure temporary password is generated after
                            successful account creation. Give the password to
                            the account owner securely. They will be required
                            to change it during their first login.
                        </p>
                    </div>
                </div>

                {/* Section Heading */}
                <div className="mb-5">
                    <div className="flex items-center gap-3">
                        <div className="h-6 w-1 rounded-full bg-blue-600" />

                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Create New Account
                            </h2>

                            <p className="mt-0.5 text-sm text-slate-500">
                                Select the appropriate account type and enter
                                the required information.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Account Creation Forms */}
                <div className="grid gap-6 xl:grid-cols-2">
                    {/* Student */}
                    <AccountCreationCard
                        title="Create Student Account"
                        description="Create an approved CCS Connect student account using the official student information."
                        icon={GraduationCap}
                        badge="Student"
                        badgeClass="bg-blue-100 text-blue-700"
                        onSubmit={handleStudentSubmit}
                        processing={studentForm.processing}
                        submitLabel="Create Student"
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField
                                label="First Name"
                                name="first_name"
                                id="student-first-name"
                                value={studentForm.data.first_name}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.first_name}
                                placeholder="Enter first name"
                                required
                            />

                            <FormField
                                label="Middle Name"
                                name="middle_name"
                                id="student-middle-name"
                                value={studentForm.data.middle_name}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'middle_name',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.middle_name}
                                placeholder="Optional"
                            />

                            <FormField
                                label="Last Name"
                                name="last_name"
                                id="student-last-name"
                                value={studentForm.data.last_name}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.last_name}
                                placeholder="Enter last name"
                                required
                            />

                            <FormField
                                label="Student Number"
                                name="student_number"
                                id="student-number"
                                value={studentForm.data.student_number}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'student_number',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.student_number}
                                placeholder="00-00-000"
                                required
                            />

                            <SelectField
                                label="Year Level"
                                name="year_level"
                                id="student-year-level"
                                value={studentForm.data.year_level}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'year_level',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.year_level}
                                placeholder="Select year level"
                                required
                                options={[
                                    {
                                        value: '1st Year',
                                        label: '1st Year',
                                    },
                                    {
                                        value: '2nd Year',
                                        label: '2nd Year',
                                    },
                                    {
                                        value: '3rd Year',
                                        label: '3rd Year',
                                    },
                                    {
                                        value: '4th Year',
                                        label: '4th Year',
                                    },
                                ]}
                            />

                            <FormField
                                label="Block / Section"
                                name="block_number"
                                id="student-block-number"
                                value={studentForm.data.block_number}
                                onChange={(event) =>
                                    studentForm.setData(
                                        'block_number',
                                        event.target.value,
                                    )
                                }
                                error={studentForm.errors.block_number}
                                placeholder="e.g. BSIT-31"
                                required
                            />

                            <div className="sm:col-span-2">
                                <FormField
                                    label="Email Address"
                                    name="email"
                                    id="student-email"
                                    type="email"
                                    value={studentForm.data.email}
                                    onChange={(event) =>
                                        studentForm.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    error={studentForm.errors.email}
                                    placeholder="student@example.com"
                                    required
                                />
                            </div>
                        </div>
                    </AccountCreationCard>

                    {/* Faculty */}
                    <AccountCreationCard
                        title="Create Faculty Account"
                        description="Create an approved CCS Connect faculty account with the required employment information."
                        icon={UserPlus}
                        badge="Faculty"
                        badgeClass="bg-cyan-100 text-cyan-700"
                        onSubmit={handleFacultySubmit}
                        processing={facultyForm.processing}
                        submitLabel="Create Faculty"
                    >
                        <div className="grid gap-5 sm:grid-cols-2">
                            <FormField
                                label="First Name"
                                name="first_name"
                                id="faculty-first-name"
                                value={facultyForm.data.first_name}
                                onChange={(event) =>
                                    facultyForm.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyForm.errors.first_name}
                                placeholder="Enter first name"
                                required
                            />

                            <FormField
                                label="Middle Name"
                                name="middle_name"
                                id="faculty-middle-name"
                                value={facultyForm.data.middle_name}
                                onChange={(event) =>
                                    facultyForm.setData(
                                        'middle_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyForm.errors.middle_name}
                                placeholder="Optional"
                            />

                            <FormField
                                label="Last Name"
                                name="last_name"
                                id="faculty-last-name"
                                value={facultyForm.data.last_name}
                                onChange={(event) =>
                                    facultyForm.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                error={facultyForm.errors.last_name}
                                placeholder="Enter last name"
                                required
                            />

                            <FormField
                                label="Suffix"
                                name="suffix"
                                id="faculty-suffix"
                                value={facultyForm.data.suffix}
                                onChange={(event) =>
                                    facultyForm.setData(
                                        'suffix',
                                        event.target.value,
                                    )
                                }
                                error={facultyForm.errors.suffix}
                                placeholder="Optional"
                            />

                            <div className="sm:col-span-2">
                                <FormField
                                    label="Email Address"
                                    name="email"
                                    id="faculty-email"
                                    type="email"
                                    value={facultyForm.data.email}
                                    onChange={(event) =>
                                        facultyForm.setData(
                                            'email',
                                            event.target.value,
                                        )
                                    }
                                    error={facultyForm.errors.email}
                                    placeholder="faculty@example.com"
                                    required
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <SelectField
                                    label="Employment Type"
                                    name="employment_type"
                                    id="faculty-employment-type"
                                    value={facultyForm.data.employment_type}
                                    onChange={(event) =>
                                        facultyForm.setData(
                                            'employment_type',
                                            event.target.value,
                                        )
                                    }
                                    error={
                                        facultyForm.errors.employment_type
                                    }
                                    placeholder="Select employment type"
                                    required
                                    options={[
                                        {
                                            value: 'Full-time',
                                            label: 'Full-time',
                                        },
                                        {
                                            value: 'Part-time',
                                            label: 'Part-time',
                                        },
                                    ]}
                                />
                            </div>
                        </div>
                    </AccountCreationCard>
                </div>
            </div>

            {/* Temporary Password Modal */}
            {showPasswordModal && temporaryPassword && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm"
                    role="presentation"
                >
                    <div
                        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="account-created-title"
                    >
                        <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 px-6 py-6">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                                        <CheckCircle2 size={22} />
                                    </div>

                                    <div>
                                        <h2
                                            id="account-created-title"
                                            className="text-lg font-bold text-slate-900"
                                        >
                                            Account Created
                                        </h2>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {createdAccountType === 'student'
                                                ? 'Student'
                                                : 'Faculty'}{' '}
                                            account created successfully.
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closePasswordModal}
                                    className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    aria-label="Close temporary password dialog"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="p-6">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                                    Temporary Password
                                </p>

                                <div className="mt-2 flex items-center gap-2">
                                    <code className="min-w-0 flex-1 break-all rounded-xl bg-white px-3 py-3 text-sm font-bold text-slate-900 ring-1 ring-amber-100">
                                        {temporaryPassword}
                                    </code>

                                    <button
                                        type="button"
                                        onClick={copyTemporaryPassword}
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm ring-1 ring-amber-100 transition hover:bg-amber-100 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        aria-label="Copy temporary password"
                                        title="Copy temporary password"
                                    >
                                        <Clipboard size={18} />
                                    </button>
                                </div>

                                <p className="mt-3 text-xs leading-5 text-amber-800">
                                    Provide this temporary password to the
                                    account owner securely. The user will be
                                    required to change it during their first
                                    login.
                                </p>
                            </div>

                            <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                                <Mail size={16} />

                                <span>
                                    The account is ready for first login.
                                </span>
                            </div>

                            <button
                                type="button"
                                onClick={closePasswordModal}
                                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminConnectLayout>
    );
}
