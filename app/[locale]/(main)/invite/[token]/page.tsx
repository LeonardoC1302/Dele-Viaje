import { getTranslations } from 'next-intl/server';
import { redirect } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcceptInviteButton } from '@/components/plans/accept-invite-button';

export default async function InviteLandingPage({
  params,
}: {
  params: Promise<{ token: string; locale: string }>;
}) {
  const { token, locale } = await params;
  const t = await getTranslations('plans');
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: `/login?next=/invite/${token}`, locale });
  }

  const { data } = await supabase.rpc('preview_plan_invite', { p_token: token }).single();
  const preview = data as {
    trip_id: string | null;
    title: string | null;
    description: string | null;
    is_valid: boolean;
    reason: string | null;
  } | null;

  const reasonKey =
    preview?.reason === 'revoked'
      ? 'inviteRevoked'
      : preview?.reason === 'expired'
        ? 'inviteExpired'
        : preview?.reason === 'exhausted'
          ? 'inviteExhausted'
          : 'inviteInvalid';

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 py-16 dark:bg-neutral-950">
      <div className="w-full max-w-[480px] rounded-xl border border-neutral-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
        {preview?.is_valid ? (
          <>
            <p className="text-sm font-medium text-forest-600 dark:text-forest-400">
              {t('inviteYouAreInvited')}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
              {preview.title}
            </h1>
            {preview.description && (
              <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                {preview.description}
              </p>
            )}
            <div className="mt-6">
              <AcceptInviteButton token={token} />
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">
              {t(reasonKey)}
            </h1>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {t('inviteInvalidBody')}
            </p>
          </>
        )}
      </div>
    </main>
  );
}
