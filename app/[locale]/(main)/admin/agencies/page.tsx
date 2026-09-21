import { getTranslations } from 'next-intl/server';
import { createClient } from '@/lib/supabase/server';
import { AgencyQueue, type AgencyQueueData } from '@/components/admin/agency-queue';
import { AdminNav } from '@/components/admin/admin-nav';
import { CaseHeader, PageBody } from '@/components/cordillera/folder';

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
    <main>
      <div className="mx-auto w-full max-w-[800px] px-4 py-8 sm:px-7 sm:py-10">
        <CaseHeader title={t('agenciesTitle')} />
        <AdminNav active="agencies" />
        <AgencyQueue initialAgencies={agencies} />
      </div>
    </main>
  );
}

function NotAllowed({ message }: { message: string }) {
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-sand-500 dark:text-sand-400">{message}</p>
    </main>
  );
}
