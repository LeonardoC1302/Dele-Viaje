import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

export async function AdminNav({ active }: { active: 'dashboard' | 'reports' | 'agencies' | 'users' }) {
  const t = await getTranslations('admin');

  const items = [
    { key: 'dashboard', href: '/admin', label: t('navDashboard') },
    { key: 'reports', href: '/admin/reports', label: t('reportsTitle') },
    { key: 'agencies', href: '/admin/agencies', label: t('agenciesTitle') },
    { key: 'users', href: '/admin/users', label: t('usersTitle') },
  ] as const;

  return (
    <nav className="mb-8 flex flex-wrap gap-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href}
          className={cn(
            'rounded-full border px-3 py-1.5 text-sm transition-colors',
            active === item.key
              ? 'border-forest-600 bg-forest-600 text-white'
              : 'border-neutral-300 text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
