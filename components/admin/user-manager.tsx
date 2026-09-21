'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';

export interface AdminUserData {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'suspended';
  createdAt: string;
}

const STATUS_VARIANT: Record<AdminUserData['status'], 'success' | 'warning' | 'error'> = {
  active: 'success',
  suspended: 'warning',
  banned: 'error',
};

export function UserManager({
  currentUserId,
  initialUsers,
}: {
  currentUserId: string;
  initialUsers: AdminUserData[];
}) {
  const t = useTranslations('admin');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [users, setUsers] = useState(initialUsers);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });

  const setStatus = async (userId: string, status: AdminUserData['status']) => {
    setBusyId(userId);
    setError(null);
    const { error: updateError } = await supabase.from('profiles').update({ status }).eq('id', userId);
    setBusyId(null);
    if (updateError) {
      setError(t('actionError'));
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
  };

  const setRole = async (userId: string, role: AdminUserData['role']) => {
    setBusyId(userId);
    setError(null);
    const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', userId);
    setBusyId(null);
    if (updateError) {
      setError(t('actionError'));
      return;
    }
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
  };

  if (users.length === 0) {
    return (
      <p className="rounded-md border border-sand-200 bg-[color:var(--raised)] p-8 text-center text-sm text-sand-500 dark:border-sand-800 dark:text-sand-400">
        {t('usersEmpty')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      {users.map((user) => (
        <div
          key={user.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-sand-200 bg-[color:var(--raised)] p-4 dark:border-sand-800"
        >
          <div className="flex items-center gap-3">
            <Avatar src={user.avatarUrl ?? undefined} fallback={user.displayName ?? undefined} />
            <div>
              <Link
                href={`/users/${user.id}`}
                className="font-medium text-sand-900 hover:underline dark:text-sand-100"
              >
                {user.displayName ?? '—'}
              </Link>
              <p className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
                {t('userSince', { date: dateFormatter.format(new Date(user.createdAt)) })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={STATUS_VARIANT[user.status]}>{t(`userStatus_${user.status}` as const)}</Badge>
            {user.role === 'admin' && <Badge variant="default">{t('userRoleAdmin')}</Badge>}

            {user.status !== 'suspended' && (
              <Button
                size="xs"
                variant="secondary"
                isLoading={busyId === user.id}
                onClick={() => setStatus(user.id, 'suspended')}
              >
                {t('suspendUser')}
              </Button>
            )}
            {user.status !== 'banned' && (
              <Button
                size="xs"
                variant="destructive"
                isLoading={busyId === user.id}
                onClick={() => setStatus(user.id, 'banned')}
              >
                {t('banUser')}
              </Button>
            )}
            {user.status !== 'active' && (
              <Button size="xs" variant="ghost" isLoading={busyId === user.id} onClick={() => setStatus(user.id, 'active')}>
                {t('reactivateUser')}
              </Button>
            )}
            {user.id !== currentUserId &&
              (user.role === 'admin' ? (
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={busyId === user.id}
                  onClick={() => setRole(user.id, 'user')}
                >
                  {t('removeAdmin')}
                </Button>
              ) : (
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={busyId === user.id}
                  onClick={() => setRole(user.id, 'admin')}
                >
                  {t('makeAdmin')}
                </Button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
