/**
 * Prepares a user-typed search term for a PostgREST `or(...)` filter.
 *
 * This is not cosmetic trimming — the term is interpolated into filter
 * syntax, so two classes of character have to go:
 *
 *   1. `,` `(` `)` `"` are PostgREST's own grammar. A search for
 *      "Chirripó, Costa Rica" would otherwise be parsed as two
 *      conditions and either error or silently match the wrong thing.
 *   2. `%` `_` `*` are wildcards. Someone typing `%` would match every
 *      trip in the database, which looks like a broken filter.
 *
 * Both are stripped rather than escaped: PostgREST's escaping rules
 * differ between the URL and the value, and a trip title containing a
 * literal `%` or `_` is not a real case worth the risk of getting that
 * wrong.
 *
 * Returns null when there's nothing usable left, so callers can skip the
 * filter entirely rather than searching for an empty string (which
 * `ilike '%%'` would match everything for).
 */
export function sanitizeSearchTerm(raw: string): string | null {
  const cleaned = raw
    .trim()
    // Filter grammar and wildcards, collapsed to spaces so adjacent
    // words don't get fused together.
    .replace(/[,()"\\%_*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // Long enough to be a real query, short enough not to be a payload.
    .slice(0, 80);

  // One character matches too much to be worth a round trip.
  return cleaned.length >= 2 ? cleaned : null;
}
