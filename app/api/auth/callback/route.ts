import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

// API routes aren't nested under app/[locale], so the locale is read from
// the NEXT_LOCALE cookie next-intl's proxy sets on every request.
async function getLocale() {
  const cookieStore = await cookies();
  const value = cookieStore.get('NEXT_LOCALE')?.value;
  return routing.locales.includes(value as (typeof routing.locales)[number])
    ? value!
    : routing.defaultLocale;
}

// OAuth + email-confirmation PKCE callback (see docs/api.md §1).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const locale = await getLocale();
  const next = searchParams.get('next') ?? `/${locale}`;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_done')
          .eq('id', user.id)
          .single();

        if (!profile?.onboarding_done) {
          return NextResponse.redirect(`${origin}/${locale}/onboarding`);
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/${locale}/login?error=auth`);
}
