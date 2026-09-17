import { type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';
import { attachSupabaseSession } from '@/lib/supabase/proxy';

const handleI18nRouting = createIntlMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  return attachSupabaseSession(request, response);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw.js|icon$|icon\\..*|apple-icon$|apple-icon\\..*|manifest\\.webmanifest|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
