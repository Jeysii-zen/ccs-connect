import AdminConnectLayout from '@/layouts/AdminConnectLayout';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Pencil,
    RotateCcw,
    Search,
    ShieldCheck,
    SlidersHorizontal,
    Trash2,
    UserPlus,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
function formatFullName(user) {
    const firstName = user.first_name?.trim() ?? '';
    const middleInitial = user.middle_name?.trim()
        ? ` ${user.middle_name.trim().charAt(0).toUpperCase()}.`
        : '';
    const lastName = user.last_name?.trim() ?? '';
    const suffix = user.suffix?.trim() ? ` ${user.suffix.trim()}` : '';

    return `${firstName}${middleInitial} ${lastName}${suffix}`.trim();
}

function getPresenceStatus(lastSeenAt) {
    if (!lastSeenAt) {
        return 'Offline';
    }

    const lastSeen = new Date(lastSeenAt);
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

    return lastSeen.getTime() >= fiveMinutesAgo ? 'Online' : 'Offline';
}

function formatLastLogin(lastLoginAt) {
    if (!lastLoginAt) {
        return 'Never';
    }

    return new Date(lastLoginAt).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

function StatusBadge({ lastSeenAt }) {
    const status = getPresenceStatus(lastSeenAt);
    const isOnline = status === 'Online';

    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                isOnline
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
            }`}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
            />
            {status}
        </span>
    );
}

function EmptyTableState({ message }) {
    return (
        <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users size={21} />
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-700">
                No accounts found
            </p>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
        </div>
    );
}

function Pagination({ paginator, onPageChange }) {
    if (!paginator || paginator.last_page <= 1) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
                Showing {paginator.from} to {paginator.to} of{' '}
                {paginator.total} accounts
            </p>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    disabled={!paginator.prev_page_url}
                    onClick={() =>
                        paginator.prev_page_url &&
                        onPageChange(paginator.current_page - 1)
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {paginator.links
                    .filter(
                        (link) =>
                            link.page !== null &&
                            !link.label.includes('Previous') &&
                            !link.label.includes('Next'),
                    )
                    .map((link) => (
                        <button
                            key={link.page}
                            type="button"
                            onClick={() => onPageChange(link.page)}
                            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${
                                link.active
                                    ? 'bg-blue-600 text-white'
                                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {link.page}
                        </button>
                    ))}

                <button
                    type="button"
                    disabled={!paginator.next_page_url}
                    onClick={() =>
                        paginator.next_page_url &&
                        onPageChange(paginator.current_page + 1)
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

export default function Index() {
    const page = usePage();
    const { students, faculty, deactivated } = page.props;
    const requestedSection = new URLSearchParams(
        page.url.split('?')[1] ?? '',
    ).get('section');

    const activeSection = ['student', 'faculty', 'deactivated'].includes(
        requestedSection,
    )
        ? requestedSection
        : 'student';
    const [notification, setNotification] = useState(null);
    const [studentSearch, setStudentSearch] = useState('');
    const [studentYearLevel, setStudentYearLevel] = useState('');
    const [studentBlockNumber, setStudentBlockNumber] = useState('');

    const [facultySearch, setFacultySearch] = useState('');
    const [facultyEmploymentType, setFacultyEmploymentType] = useState('');
    const facultyFiltersInitialized = useRef(false);

    useEffect(() => {
        if (!facultyFiltersInitialized.current) {
            facultyFiltersInitialized.current = true;
            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(
                route('admin.accounts.index'),
                {
                    faculty_search: facultySearch || undefined,
                    employment_type:
                        facultyEmploymentType || undefined,
                    section: 'faculty',
                    faculty_page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [
        facultySearch,
        facultyEmploymentType,
    ]);

    const [deactivatedSearch, setDeactivatedSearch] = useState('');
    const [deactivatedRole, setDeactivatedRole] = useState('');
    const studentFiltersInitialized = useRef(false);


    useEffect(() => {
        if (!studentFiltersInitialized.current) {
            studentFiltersInitialized.current = true;
            return;
        }

        const timeout = window.setTimeout(() => {
            router.get(
                route('admin.accounts.index'),
                {
                    search: studentSearch || undefined,
                    year_level: studentYearLevel || undefined,
                    block_number: studentBlockNumber || undefined,
                    section: 'student',
                    students_page: 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        }, 350);

        return () => window.clearTimeout(timeout);
    }, [

        studentSearch,
        studentYearLevel,
        studentBlockNumber,
    ]);

    const studentForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        student_number: '',
        year_level: '',
        block_number: '',
    });

    const [editingStudent, setEditingStudent] = useState(null);

    const studentEditForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        student_number: '',
        year_level: '',
        block_number: '',
    });

    const facultyForm = useForm({
        first_name: '',
        middle_name: '',
        last_name: '',
        suffix: '',
        faculty_id: '',
        employment_type: '',
    });
    useEffect(() => {
        if (!notification) {
            return;
        }
        const timeout = window.setTimeout(() => {
            setNotification(null);
        }, 5000);
        return () => window.clearTimeout(timeout);
    }, [notification]);
    const showSuccessNotification = (accountType, identifier) => {
        setNotification({
            type: 'success',
            title: 'Account Created',
            message: `Successfully added ${accountType} Account (${identifier})`,
        });
    };

    const showErrorNotification = (accountType, errors) => {
        const firstError = Object.values(errors ?? {})[0];

        setNotification({
            type: 'error',
            title: 'Account Creation Failed',
            message:
                firstError ||
                `Failed to create ${accountType} Account. Please check the form and try again.`,
        });
    };
    const handleStudentSubmit = (event) => {
        event.preventDefault();

        const studentNumber = studentForm.data.student_number;

        studentForm.post(route('admin.accounts.students.store'), {
            preserveScroll: true,
            onSuccess: () => {
                studentForm.reset();
                showSuccessNotification(
                    'Student',
                    studentNumber,
                );
            },
            onError: (errors) => {
                showErrorNotification('Student', errors);
            },
        });
    };
    const handleStudentEditSubmit = (event) => {
        event.preventDefault();

        if (!editingStudent) {
            return;
        }

        studentEditForm.put(
            route('admin.accounts.students.update', editingStudent.id),
            {
                preserveScroll: true,
                onSuccess: () => {
                    const studentNumber = studentEditForm.data.student_number;

                    setEditingStudent(null);
                    studentEditForm.reset();
                    studentEditForm.clearErrors();

                    setNotification({
                        type: 'success',
                        title: 'Account Updated',
                        message: `Successfully updated Student Account (${studentNumber})`,
                    });
                },
                onError: (errors) => {
                    showErrorNotification('Student', errors);
                },
            },
        );
    };
    const handleFacultySubmit = (event) => {
        event.preventDefault();
        const facultyId = facultyForm.data.faculty_id;
        facultyForm.post(route('admin.accounts.faculty.store'), {
            preserveScroll: true,
            onSuccess: () => {
                facultyForm.reset();
                showSuccessNotification(
                    'Faculty',
                    facultyId,
                );
            },
            onError: (errors) => {
                showErrorNotification('Faculty', errors);
            },
        });
    };
    const closeNotification = () => {
        setNotification(null);
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
                {/* Student Accounts */}
                {activeSection === 'student' && (
                    <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <GraduationCap size={19} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-950">
                                                Student Accounts
                                            </h2>

                                            <p className="mt-0.5 text-sm text-slate-500">
                                                Active student accounts created and managed by the CCS Connect administrator.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                                    <div className="relative min-w-0 sm:w-72">
                                        <Search
                                            size={16}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="search"
                                            value={studentSearch}
                                            onChange={(event) =>
                                                setStudentSearch(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Search name or student ID"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <select
                                        value={studentYearLevel}
                                        onChange={(event) =>
                                            setStudentYearLevel(
                                                event.target.value,
                                            )
                                        }
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">
                                            All Year Levels
                                        </option>
                                        <option value="1st Year">
                                            1st Year
                                        </option>
                                        <option value="2nd Year">
                                            2nd Year
                                        </option>
                                        <option value="3rd Year">
                                            3rd Year
                                        </option>
                                        <option value="4th Year">
                                            4th Year
                                        </option>
                                    </select>

                                    <div className="relative min-w-0 sm:w-40">
                                        <SlidersHorizontal
                                            size={15}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="text"
                                            value={studentBlockNumber}
                                            onChange={(event) =>
                                                setStudentBlockNumber(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Section"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[1050px] w-full">
                                <thead className="border-b border-slate-100 bg-slate-50/80">
                                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                        <th className="px-6 py-3.5">
                                            Full Name
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Student ID
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Year Level
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Section
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Role
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Status
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Last Login
                                        </th>

                                        <th className="px-6 py-3.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {students.data?.length ? (
                                        students.data.map((student) => (
                                            <tr
                                                key={student.id}
                                                className="transition hover:bg-slate-50/70"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800">
                                                        {formatFullName(
                                                            student,
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-sm font-medium text-slate-700">
                                                    {student.student_number ||
                                                        '\u2014'}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {student.year_level || '\u2014'}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {student.block_number || '\u2014'}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                                                        {student.role}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        lastSeenAt={
                                                            student.last_seen_at
                                                        }
                                                    />
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                                                    {formatLastLogin(
                                                        student.last_login_at,
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingStudent(student);
                                                                studentEditForm.setData({
                                                                    first_name: student.first_name ?? '',
                                                                    middle_name: student.middle_name ?? '',
                                                                    last_name: student.last_name ?? '',
                                                                    student_number: student.student_number ?? '',
                                                                    year_level: student.year_level ?? '',
                                                                    block_number: student.block_number ?? '',
                                                                });
                                                                studentEditForm.clearErrors();
                                                            }}
                                                            title={`Edit ${formatFullName(student)}`}
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                                                            aria-label={`Edit ${formatFullName(student)}`}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled
                                                            title="Deactivate will be implemented in the next account-management phase."
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed"
                                                            aria-label={`Deactivate ${formatFullName(student)}`}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="8">
                                                <EmptyTableState message="Try changing the search or student filters." />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            paginator={students}
                            onPageChange={(page) =>
                                router.get(
                                    route('admin.accounts.index'),
                                    {
                                        search:
                                            studentSearch || undefined,
                                        year_level:
                                            studentYearLevel || undefined,
                                        block_number:
                                            studentBlockNumber || undefined,
                                        section: 'student',
                                        students_page: page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        />
                    </section>
                )}
                {/* Faculty Accounts */}
                {activeSection === 'faculty' && (
                    <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 px-6 py-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                            <Users size={19} />
                                        </div>

                                        <div>
                                            <h2 className="text-lg font-bold text-slate-950">
                                                Faculty Accounts
                                            </h2>

                                            <p className="mt-0.5 text-sm text-slate-500">
                                                Active faculty accounts created and managed by the CCS Connect administrator.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto">
                                    <div className="relative min-w-0 sm:w-72">
                                        <Search
                                            size={16}
                                            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                        />

                                        <input
                                            type="search"
                                            value={facultySearch}
                                            onChange={(event) =>
                                                setFacultySearch(
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Search name or faculty ID"
                                            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </div>

                                    <select
                                        value={facultyEmploymentType}
                                        onChange={(event) =>
                                            setFacultyEmploymentType(
                                                event.target.value,
                                            )
                                        }
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    >
                                        <option value="">
                                            All Employment Types
                                        </option>
                                        <option value="Part-time">
                                            Part-time
                                        </option>
                                        <option value="Full-time">
                                            Full-time
                                        </option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[950px] w-full">
                                <thead className="border-b border-slate-100 bg-slate-50/80">
                                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-slate-400">
                                        <th className="px-6 py-3.5">
                                            Full Name
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Faculty ID
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Employment
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Role
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Status
                                        </th>

                                        <th className="px-4 py-3.5">
                                            Last Login
                                        </th>

                                        <th className="px-6 py-3.5 text-right">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {faculty.data?.length ? (
                                        faculty.data.map((member) => (
                                            <tr
                                                key={member.id}
                                                className="transition hover:bg-slate-50/70"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-slate-800">
                                                        {formatFullName(member)}
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-sm font-medium text-slate-700">
                                                    {member.faculty_id || '\u2014'}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                                        {member.employment_type ||
                                                            '\u2014'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold capitalize text-blue-700">
                                                        {member.role}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <StatusBadge
                                                        lastSeenAt={
                                                            member.last_seen_at
                                                        }
                                                    />
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                                                    {formatLastLogin(
                                                        member.last_login_at,
                                                    )}
                                                </td>

                                                <td className="px-6 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            disabled
                                                            title="Edit will be implemented in the next account-management phase."
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed"
                                                            aria-label={`Edit ${formatFullName(member)}`}
                                                        >
                                                            <Pencil size={15} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            disabled
                                                            title="Deactivate will be implemented in the next account-management phase."
                                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 disabled:cursor-not-allowed"
                                                            aria-label={`Deactivate ${formatFullName(member)}`}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="7">
                                                <EmptyTableState message="Try changing the search or employment filter." />
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            paginator={faculty}
                            onPageChange={(page) =>
                                router.get(
                                    route('admin.accounts.index'),
                                    {
                                        faculty_search:
                                            facultySearch || undefined,
                                        employment_type:
                                            facultyEmploymentType ||
                                            undefined,
                                        section: 'faculty',
                                        faculty_page: page,
                                    },
                                    {
                                        preserveState: true,
                                        preserveScroll: true,
                                        replace: true,
                                    },
                                )
                            }
                        />
                    </section>
                )}
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
        label="Faculty ID Number"
        name="faculty_id"
        id="faculty-id"
        value={facultyForm.data.faculty_id}
        onChange={(event) =>
            facultyForm.setData(
                'faculty_id',
                event.target.value,
            )
        }
        error={facultyForm.errors.faculty_id}
        placeholder="Enter faculty ID number"
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
        {/* Account Creation Notification */}
        {notification && (
            <div className="fixed bottom-6 right-6 z-[100] w-[calc(100%-3rem)] max-w-md">
                <div
                    className={`flex items-start gap-3 rounded-2xl border bg-white px-4 py-4 shadow-xl ${
                        notification.type === 'success'
                            ? 'border-emerald-200'
                            : 'border-red-200'
                    }`}
                    role="alert"
                >
                    <div
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                            notification.type === 'success'
                                ? 'bg-emerald-100 text-emerald-600'
                                : 'bg-red-100 text-red-600'
                        }`}
                    >
                        {notification.type === 'success' ? (
                            <CheckCircle2 size={19} />
                        ) : (
                            <AlertCircle size={19} />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p
                            className={`text-sm font-semibold ${
                                notification.type === 'success'
                                    ? 'text-emerald-800'
                                    : 'text-red-800'
                            }`}
                        >
                            {notification.title}
                        </p>
                        <p className="mt-1 text-sm leading-5 text-slate-600">
                            {notification.message}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={closeNotification}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        aria-label="Close notification"
                    >
                        <X size={17} />
                    </button>
                </div>
            </div>
        )}
        {editingStudent && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-labelledby="student-edit-modal-title"
            >
                <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/70 px-6 py-5">
                        <div>
                            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                <Pencil size={13} />
                                Edit Student Account
                            </div>

                            <h2
                                id="student-edit-modal-title"
                                className="text-xl font-bold text-slate-950"
                            >
                                Update Student Information
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Update the official information for{' '}
                                <span className="font-semibold text-slate-700">
                                    {formatFullName(editingStudent)}
                                </span>
                                .
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => {
                                if (studentEditForm.processing) {
                                    return;
                                }

                                setEditingStudent(null);
                                studentEditForm.reset();
                                studentEditForm.clearErrors();
                            }}
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Close student edit modal"
                            disabled={studentEditForm.processing}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form
                        onSubmit={handleStudentEditSubmit}
                        className="max-h-[75vh] overflow-y-auto"
                    >
                        <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                            <FormField
                                label="First Name"
                                name="first_name"
                                id="edit-student-first-name"
                                value={studentEditForm.data.first_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'first_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.first_name}
                                placeholder="Enter first name"
                                required
                            />

                            <FormField
                                label="Middle Name"
                                name="middle_name"
                                id="edit-student-middle-name"
                                value={studentEditForm.data.middle_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'middle_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.middle_name}
                                placeholder="Optional"
                            />

                            <FormField
                                label="Last Name"
                                name="last_name"
                                id="edit-student-last-name"
                                value={studentEditForm.data.last_name}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'last_name',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.last_name}
                                placeholder="Enter last name"
                                required
                            />

                            <FormField
                                label="Student Number"
                                name="student_number"
                                id="edit-student-number"
                                value={studentEditForm.data.student_number}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'student_number',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.student_number}
                                placeholder="00-00-000"
                                required
                            />

                            <SelectField
                                label="Year Level"
                                name="year_level"
                                id="edit-student-year-level"
                                value={studentEditForm.data.year_level}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'year_level',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.year_level}
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
                                id="edit-student-block-number"
                                value={studentEditForm.data.block_number}
                                onChange={(event) =>
                                    studentEditForm.setData(
                                        'block_number',
                                        event.target.value,
                                    )
                                }
                                error={studentEditForm.errors.block_number}
                                placeholder="e.g. BSIT-31"
                                required
                            />
                        </div>

                        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingStudent(null);
                                    studentEditForm.reset();
                                    studentEditForm.clearErrors();
                                }}
                                disabled={studentEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={studentEditForm.processing}
                                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {studentEditForm.processing
                                    ? 'Saving...'
                                    : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        </AdminConnectLayout>
    );
}
