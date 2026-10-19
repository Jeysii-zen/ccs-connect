/**
 * Picks the shape from the path being loaded.
 */
export function skeletonFor(path) {
    if (path === '/dashboard') return 'dashboard';
    if (/^\/(profile|settings)/.test(path)) return 'form';
    if (/^\/events\/\d+/.test(path) || /\/check-in$/.test(path)) return 'detail';
    if (path === '/events' || path === '/my-events') return 'cards';

    return 'table';
}
