'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CalendarBlank } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, type SelectOption } from '@/components/ui/select';
import { cn } from '@/lib/utils';

function buildTimeOptions(): SelectOption[] {
  const options: SelectOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      options.push({ value, label: value });
    }
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions();

export interface DateTimeFieldProps {
  label?: string;
  required?: boolean;
  error?: boolean;
  errorText?: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minDate?: Date;
}

export function DateTimeField({
  label,
  required,
  error,
  errorText,
  value,
  onChange,
  minDate,
}: DateTimeFieldProps) {
  const locale = useLocale();
  const t = useTranslations('trips');
  const [open, setOpen] = React.useState(false);

  const time = value
    ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    : '09:00';

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const [h, m] = time.split(':').map(Number);
    const next = new Date(date);
    next.setHours(h, m, 0, 0);
    onChange(next);
    setOpen(false);
  };

  const handleTimeChange = (newTime: string) => {
    const [h, m] = newTime.split(':').map(Number);
    const next = new Date(value ?? new Date());
    next.setHours(h, m, 0, 0);
    onChange(next);
  };

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
          {required && <span className="text-red-600"> *</span>}
        </label>
      )}

      <div className="flex flex-col gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex h-10 flex-1 items-center gap-2 whitespace-nowrap rounded-lg border border-neutral-300 bg-white px-3 text-left text-sm text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600 focus-visible:ring-offset-0 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100',
                error && 'border-red-500 focus-visible:ring-red-600',
                !value && 'text-neutral-500 dark:text-neutral-400'
              )}
            >
              <CalendarBlank
                size={16}
                weight="regular"
                strokeWidth={1.5}
                className="shrink-0 text-neutral-500"
              />
              {value ? dateFormatter.format(value) : t('selectDate')}
            </button>
          </PopoverTrigger>
          <PopoverContent>
            <Calendar
              mode="single"
              selected={value ?? undefined}
              onSelect={handleDateSelect}
              disabled={minDate ? { before: minDate } : undefined}
            />
          </PopoverContent>
        </Popover>

        <div>
          <Select
            value={time}
            onValueChange={handleTimeChange}
            options={TIME_OPTIONS}
          />
        </div>
      </div>

      {errorText && error && (
        <p className="text-xs text-red-600 dark:text-red-400">{errorText}</p>
      )}
    </div>
  );
}
