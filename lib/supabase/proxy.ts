import { createServerClient } from '@supabase/ssr';
import { type NextRequest, type NextResponse } from 'next/server';

// Refreshes the Supabase session cookie on the response next-intl already
// built, so Server Components always see a valid (non-expired) session.
// Route protection itself happens per-page/route with createClient() +
// getUser(), not here.
export async function attachSupabaseSession(
  request: NextRequest,
  response: NextResponse
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();

  return response;
}
