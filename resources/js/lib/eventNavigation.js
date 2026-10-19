const viewOf = (url) => url.searchParams.get('view') ?? 'all';
const creating = (url) => url.searchParams.get('create') === '1';

/**
 * Whether an Events sidebar action matches the current page.
 *
 * "Create Event" (create=1) is active only while the create form is open
 * from the sidebar; the view actions match on ?view= (default "all"), and
 * other parameters such as page or q do not change the highlight.
 *
 * @param {URL} current
 * @param {URL} target
 */
export function isEventActionActive(current, target) {
    if (current.pathname !== target.pathname) {
        return false;
    }

    if (creating(target) || creating(current)) {
        return creating(target) && creating(current);
    }

    return viewOf(current) === viewOf(target);
}
