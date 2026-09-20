import { getTranslations } from 'next-intl/server';
import { Flag, Buildings, Users } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/admin-nav';

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
    <main className="min-h-[100dvh] bg-neutral-50 py-12 dark:bg-neutral-950">
      <div className="mx-auto max-w-[900px] px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {t('dashboardTitle')}
        </h1>

        <div className="mt-6">
          <AdminNav active="dashboard" />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-xl border border-neutral-200 bg-white p-6 transition-colors hover:border-forest-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-forest-700"
            >
              <card.icon size={24} weight="regular" strokeWidth={1.5} className="text-forest-600 dark:text-forest-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{card.title}</p>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{card.countLabel}</p>
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
      <p className="text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
    </main>
  );
}
