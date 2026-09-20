'use client';

import { X } from '@phosphor-icons/react';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export interface TimePickerProps {
  label?: string;
  value: string; // 'HH:MM' or ''
  onChange: (value: string) => void;
  className?: string;
}

// A pair of app-styled Selects instead of the native <input type="time">,
// whose browser-drawn chrome (spinner arrows, AM/PM segments, locale-
// dependent layout) doesn't take Tailwind classes and looks out of place
// next to every other custom-built control in this app.
export function TimePicker({ label, value, onChange, className }: TimePickerProps) {
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const setHour = (h: string) => onChange(`${h}:${minute || '00'}`);
  const setMinute = (m: string) => onChange(`${hour || '00'}:${m}`);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {label}
        </label>
      )}
      <div className="flex items-center gap-1">
        <Select
          value={hour}
          onValueChange={setHour}
          placeholder="--"
          options={HOURS.map((h) => ({ value: h, label: h }))}
          className="w-[72px]"
        />
        <span className="text-neutral-400 dark:text-neutral-600">:</span>
        <Select
          value={minute}
          onValueChange={setMinute}
          placeholder="--"
          options={MINUTES.map((m) => ({ value: m, label: m }))}
          className="w-[72px]"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-400"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>
    </div>
  );
}
