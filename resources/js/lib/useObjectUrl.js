import { useEffect, useMemo } from 'react';

/**
 * A blob: URL previewing `file` (or null), revoked once it is no longer shown.
 * Keyed on the file's contents, not its identity: Inertia's useForm
 * deep-clones its data into a new File on every setData, and revoking on
 * identity killed the URL the preview <img> was still showing.
 * Created during render so the new URL and the old one's revoke (after the
 * commit) never leave the <img> pointing at a revoked URL.
 */
export default function useObjectUrl(file) {
    const key = file ? `${file.name}|${file.size}|${file.type}|${file.lastModified}` : null;
    const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [key]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => (url ? () => URL.revokeObjectURL(url) : undefined), [url]);

    return url;
}
