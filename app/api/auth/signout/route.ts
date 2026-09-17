import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { routing } from '@/i18n/routing';

async function getLocale() {
  const cookieStore = await cookies();
  const value = cookieStore.get('NEXT_LOCALE')?.value;
  return routing.locales.includes(value as (typeof routing.locales)[number])
    ? value!
    : routing.defaultLocale;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const locale = await getLocale();
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}
