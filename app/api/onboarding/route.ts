import { NextResponse } from 'next/server';
import * as z from 'zod';
import { createClient } from '@/lib/supabase/server';

const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, { error: 'Use at least 2 characters.' })
    .max(60, { error: 'Keep it under 60 characters.' }),
  locale: z.enum(['es', 'en']),
  categoryPrefs: z.array(z.string()).max(10).default([]),
});

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: { code: 'ERR_UNAUTHENTICATED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => null);
  const validated = onboardingSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: 'ERR_VALIDATION',
          message: 'Invalid onboarding data.',
          issues: validated.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: validated.data.displayName,
      locale: validated.data.locale,
      category_prefs: validated.data.categoryPrefs,
      onboarding_done: true,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_UPDATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
