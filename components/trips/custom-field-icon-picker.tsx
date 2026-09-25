'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, X } from '@phosphor-icons/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CUSTOM_FIELD_ICON_GROUPS,
  customFieldIcon,
} from '@/lib/constants/custom-field-icons';
import { cn } from '@/lib/utils';

/**
 * Picks the icon for one custom detail row.
 *
 * The trigger is the same height as the two inputs beside it and shows
 * the chosen icon in place — so the form row previews the trip page row
 * rather than describing it. Empty state is a dashed well with a `+`,
 * which reads as "optional slot" instead of "missing value"; the
 * detail still saves with no icon at all.
 */
export function CustomFieldIconPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (icon: string | null) => void;
}) {
  const t = useTranslations('trips');
  const [open, setOpen] = React.useState(false);
  // Held lowercase and rendered through createElement: binding a lookup
  // to a capitalized name in a component body trips
  // react-hooks/static-components, which can't tell a table lookup from
  // a freshly-defined component. The reference is stable — it comes out
  // of a module-level map — so there is no remount to worry about.
  const selected = customFieldIcon(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={selected ? t('customFieldIconChange') : t('customFieldIconAdd')}
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/30',
            selected
              ? 'border-sand-300 bg-[color:var(--sunken)] text-forest-700 hover:border-forest-500 dark:border-sand-700 dark:text-forest-300'
              : 'border-dashed border-sand-300 text-sand-400 hover:border-sand-400 hover:text-sand-600 dark:border-sand-700 dark:text-sand-500 dark:hover:text-sand-300'
          )}
        >
          {selected ? (
            React.createElement(selected, { size: 18, weight: 'regular' })
          ) : (
            <Plus size={14} weight="bold" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[17.5rem] p-0">
        <div className="flex items-center justify-between border-b border-sand-200 px-3 py-2 dark:border-sand-700">
          <span className="micro-label">{t('customFieldIconLabel')}</span>
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className="micro-label inline-flex items-center gap-1 transition-colors hover:text-sand-800 dark:hover:text-sand-200"
            >
              <X size={11} weight="bold" />
              {t('customFieldIconClear')}
            </button>
          )}
        </div>

        <div className="max-h-72 overflow-y-auto px-3 pb-3">
          {CUSTOM_FIELD_ICON_GROUPS.map((group) => (
            <div key={group.id} className="pt-3">
              <p className="micro-label mb-1.5">{t(`customFieldIconGroups.${group.id}`)}</p>
              <div className="grid grid-cols-7 gap-1">
                {group.keys.map((key) => {
                  const Icon = customFieldIcon(key);
                  if (!Icon) return null;
                  const active = key === value;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-label={key}
                      aria-pressed={active}
                      onClick={() => {
                        onChange(key);
                        setOpen(false);
                      }}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-md transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600/30',
                        active
                          ? 'bg-forest-600 text-white'
                          : 'text-sand-600 hover:bg-sand-100 hover:text-sand-900 dark:text-sand-300 dark:hover:bg-sand-800 dark:hover:text-sand-50'
                      )}
                    >
                      <Icon size={17} weight="regular" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
