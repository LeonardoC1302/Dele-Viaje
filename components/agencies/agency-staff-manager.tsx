'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserMinus } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export interface AgencyMemberData {
  id: string;
  profileId: string;
  displayName: string | null;
  role: 'owner' | 'admin' | 'staff';
}

export function AgencyStaffManager({
  agencyId,
  currentProfileId,
  initialMembers,
}: {
  agencyId: string;
  currentProfileId: string;
  initialMembers: AgencyMemberData[];
}) {
  const t = useTranslations('agencies');
  const [supabase] = useState(() => createClient());
  const [members, setMembers] = useState(initialMembers);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const roleOptions = [
    { value: 'staff', label: t('roleStaff') },
    { value: 'admin', label: t('roleAdmin') },
  ];

  const addStaff = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setError(null);

    const res = await fetch(`/api/agencies/${agencyId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    setInviting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(
        body?.error?.code === 'ERR_USER_NOT_FOUND' ? t('staffUserNotFound') : t('staffAddError')
      );
      return;
    }

    setEmail('');
    // The response doesn't include the new member's display name — a
    // full refresh (rather than an optimistic insert) keeps this simple
    // and correct without a second round-trip to profiles_public().
    window.location.reload();
  };

  const removeStaff = async (memberId: string) => {
    setRemovingId(memberId);
    setError(null);
    const { error: updateError } = await supabase
      .from('agency_members')
      .update({ status: 'removed' })
      .eq('id', memberId);
    setRemovingId(null);

    if (updateError) {
      setError(t('staffRemoveError'));
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('staffTitle')}</h2>

      <ul className="mt-4 flex flex-col gap-2">
        {members.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800"
          >
            <span className="flex-1 truncate text-neutral-800 dark:text-neutral-200">
              {member.displayName ?? '—'}
            </span>
            <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
              {t(`role${member.role.charAt(0).toUpperCase()}${member.role.slice(1)}` as const)}
            </span>
            {member.role !== 'owner' && member.profileId !== currentProfileId && (
              <Button
                size="xs"
                variant="ghost"
                isLoading={removingId === member.id}
                onClick={() => removeStaff(member.id)}
                aria-label={t('staffRemove')}
                className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <UserMinus size={14} weight="regular" strokeWidth={1.5} />
              </Button>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <Input
          type="email"
          label={t('staffAddLabel')}
          placeholder={t('staffAddPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 min-w-[200px] flex-1"
        />
        <div className="w-32">
          <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'staff')} options={roleOptions} />
        </div>
        <Button size="sm" isLoading={inviting} onClick={addStaff}>
          {t('staffAdd')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
