'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Copy, Check, Link as LinkIcon, EnvelopeSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface PlanInvite {
  id: string;
  token: string;
  expiresAt: string;
  maxUses: number | null;
  uses: number;
  revokedAt: string | null;
}

export function InviteManager({ tripId, initialInvites }: { tripId: string; initialInvites: PlanInvite[] }) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const [invites, setInvites] = useState(initialInvites);
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [directError, setDirectError] = useState<string | null>(null);
  const [directSuccess, setDirectSuccess] = useState(false);
  // The origin is only known client-side. useSyncExternalStore reports the
  // server snapshot ('') for the initial/SSR render and the real value
  // once hydrated, without the hydration-mismatch text or the extra
  // render an effect+setState round-trip would cause.
  const origin = useSyncExternalStore(
    () => () => {},
    () => window.location.origin,
    () => ''
  );

  const inviteUrl = (token: string) => (origin ? `${origin}/${locale}/invite/${token}` : '');

  const createInvite = async () => {
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresInHours: 24 * 7 }),
    });
    setCreating(false);

    if (!res.ok) {
      setError(t('inviteCreateError'));
      return;
    }

    const { invite } = await res.json();
    setInvites((prev) => [
      {
        id: invite.id,
        token: invite.token,
        expiresAt: invite.expires_at,
        maxUses: invite.max_uses,
        uses: invite.uses,
        revokedAt: invite.revoked_at,
      },
      ...prev,
    ]);
  };

  const revokeInvite = async (id: string) => {
    setRevokingId(id);
    setError(null);
    const res = await fetch(`/api/invites/${id}`, { method: 'DELETE' });
    setRevokingId(null);

    if (!res.ok) {
      setError(t('inviteRevokeError'));
      return;
    }

    setInvites((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, revokedAt: new Date().toISOString() } : inv))
    );
  };

  const DIRECT_ERROR_KEYS: Record<string, string> = {
    ERR_USER_NOT_FOUND: 'inviteDirectUserNotFound',
    ERR_CANNOT_INVITE_SELF: 'inviteDirectCannotInviteSelf',
    ERR_ALREADY_MEMBER: 'inviteDirectAlreadyMember',
  };

  const sendDirectInvite = async () => {
    if (!email.trim()) return;
    setInviting(true);
    setDirectError(null);
    setDirectSuccess(false);
    const res = await fetch(`/api/trips/${tripId}/invites/direct`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    setInviting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const key = body?.error?.code ? DIRECT_ERROR_KEYS[body.error.code] : undefined;
      setDirectError(t(key ?? 'inviteDirectError'));
      return;
    }

    setEmail('');
    setDirectSuccess(true);
  };

  const copyLink = async (invite: PlanInvite) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId((prev) => (prev === invite.id ? null : prev)), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context); the URL is still visible in the row.
    }
  };

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const activeInvites = invites.filter((inv) => !inv.revokedAt && new Date(inv.expiresAt) > new Date());
  const inactiveInvites = invites.filter((inv) => inv.revokedAt || new Date(inv.expiresAt) <= new Date());

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('inviteManagerTitle')}
      </h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('inviteManagerHelper')}</p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-4 flex flex-wrap items-end gap-2 border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <Input
          type="email"
          label={t('inviteDirectLabel')}
          placeholder={t('inviteDirectPlaceholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setDirectSuccess(false);
          }}
          className="h-9 min-w-[200px] flex-1"
        />
        <Button size="sm" variant="secondary" isLoading={inviting} onClick={sendDirectInvite}>
          <EnvelopeSimple size={14} weight="regular" strokeWidth={1.5} />
          {t('inviteDirectSend')}
        </Button>
      </div>
      {directError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{directError}</p>}
      {directSuccess && (
        <p className="mt-2 text-sm text-forest-600 dark:text-forest-400">{t('inviteDirectSuccess')}</p>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
          {t('inviteLinksSubheading')}
        </h3>
        <Button size="xs" variant="secondary" isLoading={creating} onClick={createInvite}>
          <LinkIcon size={14} weight="regular" strokeWidth={1.5} />
          {t('inviteCreate')}
        </Button>
      </div>

      {activeInvites.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('inviteNoneActive')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {activeInvites.map((invite) => (
            <li
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-xs text-neutral-700 dark:text-neutral-300">
                  {inviteUrl(invite.token)}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {t('inviteExpiresOn', { date: dateFormatter.format(new Date(invite.expiresAt)) })}
                  {' · '}
                  {invite.maxUses
                    ? t('inviteUsesWithMax', { uses: invite.uses, max: invite.maxUses })
                    : t('inviteUsesUnlimited', { uses: invite.uses })}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button size="xs" variant="secondary" onClick={() => copyLink(invite)}>
                  {copiedId === invite.id ? (
                    <Check size={14} weight="bold" />
                  ) : (
                    <Copy size={14} weight="regular" strokeWidth={1.5} />
                  )}
                  {copiedId === invite.id ? t('inviteCopied') : t('inviteCopy')}
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  isLoading={revokingId === invite.id}
                  onClick={() => revokeInvite(invite.id)}
                  className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  {t('inviteRevoke')}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {inactiveInvites.length > 0 && (
        <p className="mt-3 text-xs text-neutral-400 dark:text-neutral-600">
          {t('inviteInactiveCount', { count: inactiveInvites.length })}
        </p>
      )}
    </div>
  );
}
