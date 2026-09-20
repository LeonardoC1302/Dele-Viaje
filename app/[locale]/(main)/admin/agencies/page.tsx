import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AgencyQueue, type AgencyQueueData } from '@/components/admin/agency-queue';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminAgenciesPage() {
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

  const { data: agencyRows } = await supabase
    .from('agencies')
    .select('id, business_name, status, created_at')
    .order('status', { ascending: true })
    .order('created_at', { ascending: false });

  const agencies: AgencyQueueData[] = (agencyRows ?? []).map((a) => ({
    id: a.id,
    businessName: a.business_name,
    status: a.status as AgencyQueueData['status'],
    createdAt: a.created_at,
  }));

  return (
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[800px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('agenciesTitle')}
        </h1>
        <div className="mt-6">
          <AdminNav active="agencies" />
        </div>
        <AgencyQueue initialAgencies={agencies} />
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
