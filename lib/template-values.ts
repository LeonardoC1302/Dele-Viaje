/**
 * Restores the blank strings that jsonb round-tripping drops.
 *
 * Tour templates (migration 0028) store waypoints, custom fields, links
 * and advisories as jsonb rather than rows. The forms send optional text
 * as `undefined` when it's empty — `note: a.note.trim() || undefined` —
 * and `JSON.stringify` omits `undefined` properties, so what comes back
 * out of the column has no `note`/`label` key at all rather than an
 * empty string.
 *
 * That is fine for the API (the Zod fields are `.optional()`), but the
 * editors are controlled React inputs typed as `string`. A missing
 * `note` crashed the advisory editor outright on `entry.note.length`,
 * which is what broke "Use template"; a missing `label` quietly turned
 * the link input into an uncontrolled one.
 *
 * The equivalent trip/tour edit pages read the same data from real
 * columns, where it is NULL and already normalised with `?? ''`. These
 * helpers give the two jsonb-backed pages the same guarantee, and they
 * fix existing rows on read rather than needing a data migration.
 */

export function normalizeAdvisories(value: unknown): { code: string; note: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is { code: string; note?: string | null } =>
      Boolean(entry) && typeof (entry as { code?: unknown }).code === 'string'
    )
    .map((entry) => ({ code: entry.code, note: entry.note ?? '' }));
}

export function normalizeLinks(value: unknown): { url: string; label: string }[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is { url: string; label?: string | null } =>
      Boolean(entry) && typeof (entry as { url?: unknown }).url === 'string'
    )
    .map((entry) => ({ url: entry.url, label: entry.label ?? '' }));
}
