/**
 * Hikmah Library & Study Lounge — Asset Path Resolver
 * Ensures all images and static media resolve correctly both in local development
 * and on GitHub Pages subdirectory deployment (/hikmah-library/).
 * Handles base64 Data URLs, external URLs, and local public paths.
 */
export function getAssetUrl(path: string): string {
  if (!path) return '';

  // Preserve base64 data URLs, blob URLs, or external links
  if (
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('http://') ||
    path.startsWith('https://')
  ) {
    return path;
  }

  // Remove leading slash to prevent domain-root redirection on GitHub Pages
  const clean = path.replace(/^\/+/, '');
  const isGhPages =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/hikmah-library');
  const base = isGhPages ? '/hikmah-library/' : '/';

  return `${base}${clean}`;
}
