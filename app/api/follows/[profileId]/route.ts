import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// See docs/api.md §"/api/follows/{profileId}".
async function requireUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (!user) {
    return NextResponse.json(
      { error: { code: 'ERR_UNAUTHENTICATED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  if (user.id === profileId) {
    return NextResponse.json(
      { error: { code: 'ERR_SELF_FOLLOW', message: "Can't follow yourself." } },
      { status: 422 }
    );
  }

  const { error } = await supabase
    .from('follows')
    .upsert({ follower_id: user.id, followed_id: profileId }, { onConflict: 'follower_id,followed_id' });

  if (error) {
    const code = error.code === '42501' ? 'ERR_ACCOUNT_NOT_ACTIVE' : 'ERR_FOLLOW_FAILED';
    return NextResponse.json(
      { error: { code, message: error.message } },
      { status: code === 'ERR_ACCOUNT_NOT_ACTIVE' ? 403 : 500 }
    );
  }

  return NextResponse.json({ following: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;
  const supabase = await createClient();
  const user = await requireUser(supabase);

  if (!user) {
    return NextResponse.json(
      { error: { code: 'ERR_UNAUTHENTICATED', message: 'Sign in required.' } },
      { status: 401 }
    );
  }

  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('followed_id', profileId);

  if (error) {
    return NextResponse.json(
      { error: { code: 'ERR_UNFOLLOW_FAILED', message: error.message } },
      { status: 500 }
    );
  }

  return NextResponse.json({ following: false });
}
