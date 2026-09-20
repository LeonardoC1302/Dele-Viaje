'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SignOut, Crown, UserMinus } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface PlanMemberData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
}

interface PlanMembersProps {
  tripId: string;
  currentUserId: string;
  ownerId: string;
  isOwner: boolean;
  members: PlanMemberData[];
}

type PendingAction = { type: 'transfer' | 'remove'; member: PlanMemberData } | { type: 'leave' } | null;

export function PlanMembers({ tripId, currentUserId, ownerId, isOwner, members }: PlanMembersProps) {
  const t = useTranslations('plans');
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [pending, setPending] = useState<PendingAction>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runTransfer = async (member: PlanMemberData) => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/transfer-owner`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOwnerId: member.id }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(t('membersActionError'));
      return;
    }
    setPending(null);
    router.refresh();
  };

  const runRemove = async (member: PlanMemberData) => {
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase
      .from('attendees')
      .update({ status: 'removed' })
      .eq('trip_id', tripId)
      .eq('profile_id', member.id);
    setLoading(false);
    if (updateError) {
      setError(t('membersActionError'));
      return;
    }
    setPending(null);
    router.refresh();
  };

  const runLeave = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/leave-plan`, { method: 'POST' });
    setLoading(false);
    if (!res.ok) {
      setError(t('membersActionError'));
      return;
    }
    router.push('/my-trips');
    router.refresh();
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('membersTitle')}
      </h2>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <ul className="mt-4 flex flex-col gap-2">
        {members.map((member) => {
          const isSelf = member.id === currentUserId;
          const isMemberOwner = member.id === ownerId;
          return (
            <li
              key={member.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
            >
              <Avatar src={member.avatarUrl ?? undefined} fallback={member.displayName ?? undefined} />
              <span className="flex-1 truncate text-sm text-neutral-800 dark:text-neutral-200">
                {member.displayName ?? '—'}
              </span>
              {isMemberOwner && (
                <span className="shrink-0 text-xs font-medium text-forest-600 dark:text-forest-400">
                  {t('membersOwnerBadge')}
                </span>
              )}
              {isOwner && !isMemberOwner && (
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setPending({ type: 'transfer', member })}
                    aria-label={t('membersTransfer')}
                    title={t('membersTransfer')}
                    className="text-neutral-500 hover:text-forest-600 dark:text-neutral-400 dark:hover:text-forest-400"
                  >
                    <Crown size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setPending({ type: 'remove', member })}
                    aria-label={t('membersRemove')}
                    title={t('membersRemove')}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <UserMinus size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                </div>
              )}
              {isSelf && !isOwner && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => setPending({ type: 'leave' })}
                  className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <SignOut size={14} weight="regular" strokeWidth={1.5} />
                  {t('membersLeave')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      {isOwner && (
        <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">{t('membersOwnerHelper')}</p>
      )}

      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent>
          {pending?.type === 'transfer' && (
            <>
              <DialogTitle>{t('confirmTransferTitle', { name: pending.member.displayName ?? '—' })}</DialogTitle>
              <DialogDescription>
                {t('confirmTransferBody', { name: pending.member.displayName ?? '—' })}
              </DialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="md" onClick={() => setPending(null)}>
                  {t('confirmCancel')}
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  isLoading={loading}
                  onClick={() => runTransfer(pending.member)}
                >
                  {t('confirmTransferConfirm')}
                </Button>
              </div>
            </>
          )}
          {pending?.type === 'remove' && (
            <>
              <DialogTitle>{t('confirmRemoveTitle', { name: pending.member.displayName ?? '—' })}</DialogTitle>
              <DialogDescription>
                {t('confirmRemoveBody', { name: pending.member.displayName ?? '—' })}
              </DialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="md" onClick={() => setPending(null)}>
                  {t('confirmCancel')}
                </Button>
                <Button
                  variant="destructive"
                  size="md"
                  isLoading={loading}
                  onClick={() => runRemove(pending.member)}
                >
                  {t('confirmRemoveConfirm')}
                </Button>
              </div>
            </>
          )}
          {pending?.type === 'leave' && (
            <>
              <DialogTitle>{t('confirmLeavePlanTitle')}</DialogTitle>
              <DialogDescription>{t('confirmLeavePlanBody')}</DialogDescription>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="md" onClick={() => setPending(null)}>
                  {t('confirmCancel')}
                </Button>
                <Button variant="destructive" size="md" isLoading={loading} onClick={runLeave}>
                  {t('confirmLeavePlanConfirm')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
