import { getTranslations } from 'next-intl/server';
import { EnvelopeSimple } from '@phosphor-icons/react/dist/ssr';

export default async function CheckEmailPage() {
  const t = await getTranslations('auth.checkEmail');

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-neutral-50 px-4 text-center dark:bg-neutral-950">
      <div className="max-w-[400px]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-50 text-forest-600 dark:bg-forest-950 dark:text-forest-400">
          <EnvelopeSimple size={28} weight="regular" strokeWidth={1.5} />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-neutral-900 dark:text-neutral-50">
          {t('title')}
        </h1>
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
          {t('body')}
        </p>
      </div>
    </main>
  );
}
