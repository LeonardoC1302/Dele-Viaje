'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AgencyQueueData {
  id: string;
  businessName: string;
  status: 'pending' | 'approved' | 'suspended' | 'rejected';
  createdAt: string;
}

const NEXT_ACTIONS: Record<string, { action: string; label: string; variant: 'default' | 'destructive' }[]> = {
  pending: [
    { action: 'approved', label: 'approve', variant: 'default' },
    { action: 'rejected', label: 'reject', variant: 'destructive' },
  ],
  approved: [{ action: 'suspended', label: 'suspend', variant: 'destructive' }],
  suspended: [{ action: 'approved', label: 'reactivate', variant: 'default' }],
  rejected: [{ action: 'approved', label: 'approve', variant: 'default' }],
};

export function AgencyQueue({ initialAgencies }: { initialAgencies: AgencyQueueData[] }) {
  const t = useTranslations('admin');
  const [agencies, setAgencies] = useState(initialAgencies);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const setStatus = async (agencyId: string, status: string) => {
    setPendingId(agencyId);
    setError(null);
    const res = await fetch(`/api/admin/agencies/${agencyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setPendingId(null);

    if (!res.ok) {
      setError(t('actionError'));
      return;
    }

    setAgencies((prev) =>
      prev.map((a) => (a.id === agencyId ? { ...a, status: status as AgencyQueueData['status'] } : a))
    );
  };

  if (agencies.length === 0) {
    return <p className="text-sm text-neutral-500 dark:text-neutral-400">{t('agenciesEmpty')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {agencies.map((agency) => (
        <div
          key={agency.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
        >
          <div>
            <Link href={`/agencies/${agency.id}`} className="font-medium text-neutral-900 hover:underline dark:text-neutral-100">
              {agency.businessName}
            </Link>
            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
              {dateFormatter.format(new Date(agency.createdAt))}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={agency.status === 'approved' ? 'default' : 'secondary'}>
              {t(`agencyStatus_${agency.status}` as const)}
            </Badge>
            {(NEXT_ACTIONS[agency.status] ?? []).map((next) => (
              <Button
                key={next.action}
                size="xs"
                variant={next.variant === 'destructive' ? 'destructive' : 'secondary'}
                isLoading={pendingId === agency.id}
                onClick={() => setStatus(agency.id, next.action)}
              >
                {t(`agencyAction_${next.label}` as const)}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
