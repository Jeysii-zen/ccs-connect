const viewOf = (url) => url.searchParams.get('view') ?? 'announcements';

/**
 * Whether an Announcements sidebar action matches the current page.
 *
 * Actions match on ?view= (default "announcements"); other parameters such
 * as page or create=1 do not change which action is highlighted.
 *
 * @param {URL} current
 * @param {URL} target
 */
export function isAnnouncementActionActive(current, target) {
    if (current.pathname !== target.pathname) {
        return false;
    }

    return viewOf(current) === viewOf(target);
}
