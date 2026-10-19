import GlassConfirmDialog from '@/components/ui/GlassConfirmDialog';
import { Building2, UserX } from 'lucide-react';
import { useState } from 'react';

/**
 * Accounts are not deleted or deactivated from here: deactivation needs an
 * administrator's approval, requested in person at the CCS department
 * office (questionnaire Q10/Q11). Nothing is sent to the server.
 */
export default function DeactivateAccountNotice({ className = '' }) {
    const [open, setOpen] = useState(false);

    return (
        <section className={`space-y-5 ${className}`}>
            <header>
                <h2 className="text-lg font-bold text-slate-900">Deactivate account</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                    A deactivated account can no longer sign in. Your records, such as event
                    registrations, are kept.
                </p>
            </header>

            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50"
            >
                <UserX size={16} />
                Deactivate account
            </button>

            <GlassConfirmDialog
                open={open}
                icon={Building2}
                tone="danger"
                title="Admin approval required"
                confirmLabel="I understand"
                hideCancel
                onCancel={() => setOpen(false)}
                onConfirm={() => setOpen(false)}
            >
                <p>
                    Accounts can only be deactivated by the CCS administrator. To request
                    deactivation, please go in person to the{' '}
                    <strong className="text-slate-800">College of Computing Studies (CCS) department office</strong>{' '}
                    and ask for the administrator&apos;s approval.
                </p>
                <p className="mt-3">Your account stays active until an administrator deactivates it.</p>
            </GlassConfirmDialog>
        </section>
    );
}
