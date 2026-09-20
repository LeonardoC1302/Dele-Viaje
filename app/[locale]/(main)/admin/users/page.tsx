import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { UserManager, type AdminUserData } from '@/components/admin/user-manager';
import { Input } from '@/components/ui/input';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const t = await getTranslations('admin');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <NotAllowed message={t('notAllowed')} />;
  }

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

  if (myProfile?.role !== 'admin') {
    return <NotAllowed message={t('notAllowed')} />;
  }

  let query = supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q?.trim()) {
    query = query.ilike('display_name', `%${q.trim()}%`);
  }

  const { data: rows } = await query;

  const users: AdminUserData[] = (rows ?? []).map((r) => ({
    id: r.id,
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    role: r.role as AdminUserData['role'],
    status: r.status as AdminUserData['status'],
    createdAt: r.created_at,
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('usersTitle')}
        </h1>

        <div className="mt-6">
          <AdminNav active="users" />
        </div>

        <form method="get">
          <Input name="q" defaultValue={q ?? ''} placeholder={t('usersSearchPlaceholder')} className="max-w-sm" />
        </form>

        <div className="mt-6">
          <UserManager currentUserId={user.id} initialUsers={users} />
        </div>
      </div>
    </main>
  );
}

function NotAllowed({ message }: { message: string }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </main>
  );
}
