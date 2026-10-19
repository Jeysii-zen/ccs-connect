import GlassConfirmDialog from '@/components/ui/GlassConfirmDialog';

// Event confirmations (publish, archive, delete, discard, register) use the
// shared glass dialog.
export default function ConfirmDialog(props) {
    return <GlassConfirmDialog {...props} />;
}
