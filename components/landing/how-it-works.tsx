'use client';

import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import { UsersThree, ShieldCheck, CalendarCheck } from '@phosphor-icons/react';

export function HowItWorks() {
  const t = useTranslations('howItWorks');
  const reduce = useReducedMotion();

  const item = (delay: number) => ({
    initial: reduce ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section id="how-it-works" className="py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-[520px] text-3xl font-bold tracking-tight text-neutral-900 md:text-4xl dark:text-neutral-100">
          {t('title')}
        </h2>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <motion.div
            {...item(0)}
            className="relative col-span-1 row-span-2 overflow-hidden rounded-xl bg-forest-600 p-8 text-white lg:col-span-2"
          >
            <UsersThree size={32} weight="regular" strokeWidth={1.5} />
            <h3 className="mt-6 text-2xl font-semibold">{t('social.title')}</h3>
            <p className="mt-3 max-w-[420px] text-forest-50/90">
              {t('social.body')}
            </p>
            <div className="pointer-events-none absolute -right-10 -bottom-10 h-56 w-56 rounded-full bg-forest-500/40 blur-3xl" />
          </motion.div>

          <motion.div
            {...item(0.1)}
            className="rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <ShieldCheck
              size={32}
              weight="regular"
              strokeWidth={1.5}
              className="text-forest-600 dark:text-forest-400"
            />
            <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t('tour.title')}
            </h3>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              {t('tour.body')}
            </p>
          </motion.div>

          <motion.div
            {...item(0.2)}
            className="rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <CalendarCheck
              size={32}
              weight="regular"
              strokeWidth={1.5}
              className="text-forest-600 dark:text-forest-400"
            />
            <h3 className="mt-6 text-xl font-semibold text-neutral-900 dark:text-neutral-100">
              {t('private.title')}
            </h3>
            <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
              {t('private.body')}
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
