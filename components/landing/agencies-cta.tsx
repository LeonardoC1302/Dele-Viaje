'use client';

import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';

export function AgenciesCta() {
  const t = useTranslations('agenciesCta');
  const reduce = useReducedMotion();

  return (
    <section id="agencies" className="bg-forest-600 py-24 dark:bg-forest-700">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-[720px] px-4 text-center sm:px-6 lg:px-8"
      >
        <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
          {t('title')}
        </h2>
        <p className="mx-auto mt-4 max-w-[480px] text-lg text-forest-50/90">
          {t('body')}
        </p>
        <div className="mt-8">
          <Button
            size="lg"
            variant="secondary"
            className="bg-white text-forest-700 hover:bg-forest-50 dark:bg-white dark:text-forest-700 dark:hover:bg-forest-50"
          >
            {t('cta')}
          </Button>
        </div>
      </motion.div>
    </section>
  );
}
