// URL slug helpers for school pages.
// The [id] route accepts both UUIDs (legacy) and URL-encoded school names (SEO).

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function schoolSlug(name: string): string {
  return encodeURIComponent(name.trim());
}

export function schoolHref(name: string): string {
  return `/school/${schoolSlug(name)}`;
}
