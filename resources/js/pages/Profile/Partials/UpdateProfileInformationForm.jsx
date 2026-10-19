import ImageDropzone from '@/components/ui/ImageDropzone';
import { fieldClass, labelClass, primaryButtonClass } from '@/components/ui/formStyles';
import { useForm, usePage } from '@inertiajs/react';
import { Lock, Trash2 } from 'lucide-react';
import { useState } from 'react';
import useObjectUrl from '@/lib/useObjectUrl';

// Mirrors ProfileUpdateRequest.
const PICTURE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

function pictureUrl(path) {
    if (!path) return null;
    if (/^(https?:)?\//.test(path)) return path;

    return `/storage/${path}`;
}

function fullName(user) {
    return [user.first_name, user.middle_name, user.last_name, user.suffix].filter(Boolean).join(' ');
}

function ReadOnlyField({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold text-slate-800">{value || '—'}</p>
        </div>
    );
}

/**
 * Users edit their email and profile picture. Official details are shown
 * read-only: they are kept by the CCS administrator, and the server ignores
 * them in this form anyway.
 */
export default function UpdateProfileInformation({ className = '' }) {
    const user = usePage().props.auth.user;
    const isStudent = user.role === 'student';

    const form = useForm({
        email: user.email ?? '',
        profile_picture: null,
        remove_profile_picture: false,
        _method: 'patch',
    });

    const preview = useObjectUrl(form.data.profile_picture);
    const [pictureError, setPictureError] = useState('');

    const currentPicture = form.data.remove_profile_picture ? null : preview ?? pictureUrl(user.profile_picture_path);

    const choosePicture = (file) => {
        if (!file) return;

        if (!PICTURE_TYPES.includes(file.type)) {
            setPictureError('The profile picture must be a JPG, PNG or WEBP image.');
            return;
        }

        if (file.size > MAX_PICTURE_BYTES) {
            setPictureError('The profile picture must not be larger than 5 MB.');
            return;
        }

        setPictureError('');
        form.clearErrors('profile_picture');
        form.setData((data) => ({ ...data, profile_picture: file, remove_profile_picture: false }));
    };

    const removePicture = () => {
        setPictureError('');
        form.setData((data) => ({ ...data, profile_picture: null, remove_profile_picture: true }));
    };

    const submit = (event) => {
        event.preventDefault();

        if (form.processing) return;

        form.post(route('profile.update'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => form.setData((data) => ({ ...data, profile_picture: null, remove_profile_picture: false })),
        });
    };

    const pictureMessage = pictureError || form.errors.profile_picture;

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-bold text-slate-900">Profile information</h2>
                <p className="mt-1 text-sm text-slate-500">Update your email address and profile picture.</p>
            </header>

            <div className="mt-6">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Lock size={15} className="text-slate-400" />
                    Official details
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                        <ReadOnlyField label="Full name" value={fullName(user)} />
                    </div>
                    {isStudent ? (
                        <>
                            <ReadOnlyField label="Student number" value={user.student_number} />
                            <ReadOnlyField
                                label="Year level and block"
                                value={[user.year_level, user.block_number].filter(Boolean).join(' · ')}
                            />
                        </>
                    ) : (
                        <>
                            <ReadOnlyField label={user.role === 'faculty' ? 'Faculty ID' : 'Role'} value={user.role === 'faculty' ? user.faculty_id : 'Administrator'} />
                            {user.employment_type && <ReadOnlyField label="Employment type" value={user.employment_type} />}
                        </>
                    )}
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                    These details are kept by the CCS administrator. If any of them are wrong, visit
                    the College of Computing Studies (CCS) department office to have them corrected.
                </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-6">
                <div>
                    <p className={labelClass}>Profile picture</p>
                    <div className="mt-2 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-start">
                        <ImageDropzone
                            id="profile-picture"
                            accept={PICTURE_TYPES}
                            disabled={form.processing}
                            preview={currentPicture}
                            previewAlt="Profile picture preview"
                            previewClassName="h-48"
                            title="Drag and drop a photo here"
                            hint="JPG, PNG or WEBP · up to 5 MB"
                            invalid={Boolean(pictureMessage)}
                            describedBy={pictureMessage ? 'profile-picture-error' : undefined}
                            onFiles={([file]) => choosePicture(file)}
                        />
                        <div className="space-y-2 text-xs text-slate-500">
                            <p>Shown on your dashboard and in the top bar.</p>
                            {form.data.profile_picture && (
                                <p className="truncate">
                                    New picture: <span className="font-medium text-slate-700">{form.data.profile_picture.name}</span>
                                </p>
                            )}
                            {currentPicture && (
                                <button
                                    type="button"
                                    onClick={removePicture}
                                    disabled={form.processing}
                                    className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5 font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                                >
                                    <Trash2 size={14} />
                                    Remove picture
                                </button>
                            )}
                            {form.data.remove_profile_picture && (
                                <p className="font-medium text-amber-700">The picture will be removed when you save.</p>
                            )}
                        </div>
                    </div>
                    {pictureMessage && (
                        <p id="profile-picture-error" className="mt-1.5 text-xs font-medium text-red-600">
                            {pictureMessage}
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="email" className={labelClass}>
                        Email address
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) => form.setData('email', event.target.value)}
                        required
                        maxLength={255}
                        autoComplete="email"
                        className={fieldClass}
                    />
                    {form.errors.email && <p className="mt-1.5 text-xs font-medium text-red-600">{form.errors.email}</p>}
                </div>

                <button type="submit" disabled={form.processing || !form.isDirty} className={primaryButtonClass}>
                    {form.processing ? 'Saving...' : 'Save changes'}
                </button>
            </form>
        </section>
    );
}
