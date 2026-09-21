import { getTranslations } from 'next-intl/server';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/ssr';
import { Link } from '@/i18n/navigation';
import { AuthPanel } from '@/components/auth/auth-panel';

export default async function CheckEmailPage() {
  const t = await getTranslations('auth.checkEmail');
  const tLogin = await getTranslations('auth.login');

  return (
    <AuthPanel
      title={t('title')}
      subtitle={t('body')}
      footer={
        <Link href="/login" className="link font-semibold">
          {tLogin('title')}
        </Link>
      }
    >
      <div className="mt-6 flex items-center gap-3 rounded-md border border-sand-200 bg-[color:var(--sunken)] p-4 dark:border-sand-800">
        <EnvelopeSimple
          size={22}
          className="shrink-0 text-dawn-600 dark:text-dawn-400"
          aria-hidden="true"
        />
        <p className="text-sm leading-relaxed text-sand-600 dark:text-sand-400">
          {t('hint')}
        </p>
      </div>
    </AuthPanel>
  );
}
