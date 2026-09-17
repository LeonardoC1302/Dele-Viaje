import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createTripSchema } from '@/lib/validators/trip';

// See docs/api.md §3. Only `type: social` / `visibility: public` trips are
// supported until agencies (tours) and private plans land in later phases.
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
  const validated = createTripSchema.safeParse(body);

  if (!validated.success) {
    return NextResponse.json(
      {
        error: {
          code: 'ERR_VALIDATION',
          message: 'Invalid trip data.',
          issues: validated.error.flatten(),
        },
      },
      { status: 422 }
    );
  }

  const { data, error } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      type: 'social',
      visibility: 'public',
      status: 'published',
      title: validated.data.title,
      description: validated.data.description,
      category: validated.data.category,
      location_name: validated.data.locationName,
      start_at: validated.data.startAt,
      end_at: validated.data.endAt,
      capacity: validated.data.capacity ?? null,
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
