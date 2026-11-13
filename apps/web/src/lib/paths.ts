/** Prefix a site-relative path with the deploy base (e.g. `/meridian-tryon/`). */
export const withBase = (path = '') => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\//, '')}`;
