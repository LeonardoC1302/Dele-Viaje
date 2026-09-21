'use client';

import { X } from '@phosphor-icons/react';
import { Select } from '@/components/ui/select';
import { FieldShell } from '@/components/ui/field';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

export interface TimePickerProps {
  label?: string;
  value: string; // 'HH:MM' or ''
  onChange: (value: string) => void;
  className?: string;
}

/**
 * A pair of app-styled Selects instead of the native `<input type="time">`,
 * whose browser-drawn chrome (spinner arrows, AM/PM segments, locale-
 * dependent layout) doesn't take Tailwind classes and looks out of place
 * next to every other custom-built control in this app.
 *
 * The label goes through `FieldShell`, the same wrapper `Input` and
 * `Textarea` use, rather than being hand-written here. That is the fix
 * for a real misalignment: this component used to draw its own
 * `text-sm font-medium` label while the fields beside it used the
 * micro-label, which is ~9px shorter — so in any row mixing the two,
 * the time control sat visibly lower than everything else. Sharing the
 * shell means they cannot drift apart again.
 */
export function TimePicker({ label, value, onChange, className }: TimePickerProps) {
  const [hour, minute] = value ? value.split(':') : ['', ''];

  const setHour = (h: string) => onChange(`${h}:${minute || '00'}`);
  const setMinute = (m: string) => onChange(`${hour || '00'}:${m}`);

  return (
    <FieldShell label={label} className={cn(className)}>
      <div className="flex items-center gap-1.5">
        <Select
          value={hour}
          onValueChange={setHour}
          placeholder="--"
          options={HOURS.map((h) => ({ value: h, label: h }))}
          className="tnum w-[68px]"
        />
        <span aria-hidden="true" className="text-sand-400 dark:text-sand-600">
          :
        </span>
        <Select
          value={minute}
          onValueChange={setMinute}
          placeholder="--"
          options={MINUTES.map((m) => ({ value: m, label: m }))}
          className="tnum w-[68px]"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label="Clear"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-700 dark:text-sand-500 dark:hover:bg-sand-800 dark:hover:text-sand-300"
          >
            <X size={14} weight="bold" />
          </button>
        )}
      </div>
    </FieldShell>
  );
}
