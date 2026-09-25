import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { attachSupabaseSession } from '@/lib/supabase/proxy';

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  return attachSupabaseSession(request, response);
}

// Everything not excluded here gets a locale prefix. Static files served
// straight out of public/ must be excluded by name, exactly like sw.js:
// maplibre-gl-worker.mjs has to stay at the root because a Worker can
// only be constructed from a same-origin URL, and a 307 to /es/... is
// not that URL (see lib/maplibre-worker.ts).
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|maplibre-gl-[a-z]+\\.mjs|icon$|icon\\..*|apple-icon$|apple-icon\\..*|manifest\\.webmanifest|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
