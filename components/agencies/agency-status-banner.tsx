'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

export type AgencyStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

const STYLES: Record<AgencyStatus, string> = {
  pending: 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
  approved:
    'border-forest-300 bg-forest-50 text-forest-800 dark:border-forest-800 dark:bg-forest-600/20 dark:text-forest-300',
  suspended: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
  rejected: 'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300',
};

export function AgencyStatusBanner({ status }: { status: AgencyStatus }) {
  const t = useTranslations('agencies');

  if (status === 'approved') return null;

  return (
    <div className={cn('rounded-lg border p-4 text-sm', STYLES[status])}>
      <p className="font-semibold">{t(`status_${status}_title` as const)}</p>
      <p className="mt-1">{t(`status_${status}_body` as const)}</p>
    </div>
  );
}
