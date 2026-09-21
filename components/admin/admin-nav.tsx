import { getTranslations } from 'next-intl/server';
import { FolderTabs, type FolderTab } from '@/components/cordillera/folder';

/**
 * Admin's four pages are sections of one folder, not four destinations,
 * so they get the same cut tabs a trip's sections get rather than a
 * separate pill nav. Each page renders its body inside a `FolderFace`
 * with `seam`, which is what joins the active tab to the sheet.
 */
export async function AdminNav({
  active,
}: {
  active: 'dashboard' | 'reports' | 'agencies' | 'users';
}) {
  const t = await getTranslations('admin');

  const tabs: FolderTab[] = [
    { href: '/admin', label: t('navDashboard'), active: active === 'dashboard' },
    { href: '/admin/reports', label: t('reportsTitle'), active: active === 'reports' },
    { href: '/admin/agencies', label: t('agenciesTitle'), active: active === 'agencies' },
    { href: '/admin/users', label: t('usersTitle'), active: active === 'users' },
  ];

  return <FolderTabs tabs={tabs} />;
}
