import { getTranslations } from 'next-intl/server';
import { Flag, Buildings, Users } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/admin-nav';
import { CaseHeader, PageBody } from '@/components/cordillera/folder';

export default async function AdminHomePage() {
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

  const [openReports, pendingAgencies, totalUsers] = await Promise.all([
    supabase.from('report_tickets').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('agencies').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  const cards = [
    {
      href: '/admin/reports',
      icon: Flag,
      title: t('reportsTitle'),
      count: openReports.count ?? 0,
      countLabel: t('openCount', { count: openReports.count ?? 0 }),
    },
    {
      href: '/admin/agencies',
      icon: Buildings,
      title: t('agenciesTitle'),
      count: pendingAgencies.count ?? 0,
      countLabel: t('pendingCount', { count: pendingAgencies.count ?? 0 }),
    },
    {
      href: '/admin/users',
      icon: Users,
      title: t('usersTitle'),
      count: totalUsers.count ?? 0,
      countLabel: t('totalCount', { count: totalUsers.count ?? 0 }),
    },
  ] as const;

  return (
    <main>
      <div className="mx-auto w-full max-w-[900px] px-4 py-8 sm:px-7 sm:py-10">
        <CaseHeader title={t('dashboardTitle')} />

        <AdminNav active="dashboard" />

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-md border border-sand-200 bg-[color:var(--raised)] p-6 transition-colors hover:border-dawn-300 dark:border-sand-800 dark:hover:border-dawn-700"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-md bg-dawn-50 dark:bg-dawn-900/40">
                <card.icon size={22} weight="regular" strokeWidth={1.5} className="text-dawn-600 dark:text-dawn-300" />
              </div>
              <p className="mt-4 font-display text-sm font-bold text-sand-900 dark:text-sand-100">{card.title}</p>
              <p className="mt-1 text-xs text-sand-500 dark:text-sand-400">{card.countLabel}</p>
            </Link>
          ))}
        </div>
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
