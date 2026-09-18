import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createReportSchema } from '@/lib/validators/report';

// See docs/api.md §8 / docs/data-model.md "report_tickets". Any signed-in
// user can file a report; the admin queue (migration 0009 RLS) is the only
// thing that can update status/admin_note afterwards.
export async function POST(request: Request) {
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
  const validated = createReportSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: 'ERR_VALIDATION',
          message: 'Invalid report data.',
          issues: validated.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from('report_tickets')
    .insert({
      reporter_id: user.id,
      target_type: validated.data.targetType,
      target_id: validated.data.targetId,
      reason: validated.data.reason,
      description: validated.data.description || null,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_CREATE_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}
