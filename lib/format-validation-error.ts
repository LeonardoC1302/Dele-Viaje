// Every API route that validates with zod returns `{ error: { code:
// 'ERR_VALIDATION', message: 'Invalid ... data.', issues: <zod .flatten()
// output> } }` — but until now every form only ever showed `.message`, a
// generic "Invalid tour data" with no indication of which field or why.
// The detail was always in the response, just never read.
//
// Field names are humanized (camelCase -> "Camel case") rather than
// translated — zod's own validation messages ("Too small: expected
// number to be >=1000") aren't localized either regardless of the app's
// current locale, so a fully-translated field label next to an
// English-only reason would be an inconsistent half-measure. This is
// still a large improvement over no detail at all; full localization of
// validation messages is a separate, bigger piece of work.
interface ZodFlattenedIssues {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
}

function humanizeField(field: string): string {
  const spaced = field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatValidationIssues(issues: ZodFlattenedIssues | undefined | null): string | null {
  if (!issues) return null;

  const parts: string[] = [...(issues.formErrors ?? [])];

  for (const [field, messages] of Object.entries(issues.fieldErrors ?? {})) {
    if (!messages || messages.length === 0) continue;
    parts.push(`${humanizeField(field)}: ${messages[0]}`);
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}

// Reads a fetch Response body already parsed as JSON and produces the
// best available error string: field-level detail when there is any,
// else the route's own `.message`, else a caller-supplied fallback.
export function extractErrorMessage(
  body: { error?: { message?: string; issues?: ZodFlattenedIssues } } | null,
  fallback: string
): string {
  const detailed = formatValidationIssues(body?.error?.issues);
  return detailed ?? body?.error?.message ?? fallback;
}
