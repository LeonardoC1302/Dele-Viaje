'use client';

import * as React from 'react';
import { DayPicker, type ChevronProps } from 'react-day-picker';
import { es, enUS } from 'react-day-picker/locale';
import { useLocale } from 'next-intl';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Chevron({ orientation }: ChevronProps) {
  return orientation === 'left' ? (
    <CaretLeft size={16} weight="bold" />
  ) : (
    <CaretRight size={16} weight="bold" />
  );
}

function Calendar({ className, classNames, ...props }: CalendarProps) {
  const locale = useLocale();

  return (
    <DayPicker
      locale={locale === 'es' ? es : enUS}
      showOutsideDays
      className={cn('p-1', className)}
      classNames={{
        // `nav` is the first child of `months` (before the caption) and is
        // absolutely positioned so the arrows sit on the caption row. That
        // needs two things the library's own stylesheet would have given us,
        // but we never import it: a positioned containing block here, and a
        // z-index — otherwise the full-width `month_caption` below, which is
        // `relative` and later in the DOM, paints over the arrows and eats
        // every click.
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'relative flex items-center justify-center pt-1',
        caption_label:
          'text-sm font-semibold text-sand-900 dark:text-sand-100',
        nav: 'absolute inset-x-0 top-0 z-10 flex items-center justify-between',
        button_previous:
          'flex h-7 w-7 items-center justify-center rounded-full text-sand-500 hover:bg-sand-100 disabled:opacity-30 dark:text-sand-400 dark:hover:bg-sand-800',
        button_next:
          'flex h-7 w-7 items-center justify-center rounded-full text-sand-500 hover:bg-sand-100 disabled:opacity-30 dark:text-sand-400 dark:hover:bg-sand-800',
        month_grid: 'mt-2 w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 text-[0.75rem] font-medium text-sand-500 dark:text-sand-400',
        week: 'mt-1 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm',
        day_button:
          'h-9 w-9 rounded-full text-sm font-normal text-sand-900 transition-colors hover:bg-forest-50 dark:text-sand-100 dark:hover:bg-sand-800',
        selected:
          '[&>button]:bg-forest-600 [&>button]:text-white [&>button]:hover:bg-forest-700 [&>button]:dark:hover:bg-forest-700',
        today: '[&>button]:border [&>button]:border-forest-600',
        outside: 'text-sand-400 opacity-50 dark:text-sand-600',
        disabled: 'cursor-not-allowed opacity-40',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{ Chevron }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
