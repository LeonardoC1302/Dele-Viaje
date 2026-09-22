'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Warning, Plus, X } from '@phosphor-icons/react';
import { chipClasses } from '@/components/ui/chip';
import { controlClasses } from '@/components/ui/field';
import {
  advisoryIcon,
  sortAdvisories,
  SEVERITY_TEXT,
  type AdvisoryType,
  type AdvisorySeverity,
} from '@/lib/constants/advisories';
import { cn } from '@/lib/utils';

export interface AdvisoryInput {
  code: string;
  note: string;
}

/**
 * Advisory picker for the trip / tour / template forms.
 *
 * The available types come from the database rather than a constant, so
 * an admin can seed a new one without a deploy. Labels arrive already
 * resolved for the active locale by the caller's query.
 *
 * NOTES ARE OPT-IN. An earlier version revealed a text input for every
 * tag the moment it was selected, so picking five tags dropped five
 * empty fields into the form and made an optional detail look like five
 * required ones. Now each selected tag is listed compactly with a single
 * "add detail" affordance, and the input only exists once you ask for
 * it — or if the tag already carries a note from a previous edit.
 */
export function AdvisoryEditor({
  types,
  value,
  onChange,
}: {
  types: AdvisoryType[];
  value: AdvisoryInput[];
  onChange: (next: AdvisoryInput[]) => void;
}) {
  const t = useTranslations('advisories');
  const locale = useLocale();

  // Codes whose note field the user explicitly opened this session. A tag
  // that arrives with a note already set is open without being in here.
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const labelFor = (type: AdvisoryType) => (locale === 'en' ? type.labelEn : type.labelEs);
  const byCode = new Map(types.map((ty) => [ty.code, ty]));
  const selectedCodes = new Set(value.map((v) => v.code));

  const toggle = (code: string) => {
    if (selectedCodes.has(code)) {
      onChange(value.filter((v) => v.code !== code));
      setOpened((prev) => {
        const next = new Set(prev);
        next.delete(code);
        return next;
      });
    } else {
      onChange([...value, { code, note: '' }]);
    }
  };

  const setNote = (code: string, note: string) => {
    onChange(value.map((v) => (v.code === code ? { ...v, note } : v)));
  };

  const openNote = (code: string) => setOpened((prev) => new Set(prev).add(code));

  const closeNote = (code: string) => {
    setNote(code, '');
    setOpened((prev) => {
      const next = new Set(prev);
      next.delete(code);
      return next;
    });
  };

  // Grouped by severity so a host scanning the list sees the serious
  // options first rather than hunting through an alphabetical mix.
  const groups: AdvisorySeverity[] = ['danger', 'caution', 'info'];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="micro-label flex items-center gap-2 text-sand-600 dark:text-sand-400">
          <Warning size={14} weight="fill" className="text-dawn-600 dark:text-dawn-400" />
          {t('editorLabel')}
        </span>
        <p className="mt-1.5 text-xs leading-relaxed text-sand-500 dark:text-sand-400">
          {t('editorHelper')}
        </p>
      </div>

      {groups.map((severity) => {
        const inGroup = sortAdvisories(types.filter((ty) => ty.severity === severity));
        if (inGroup.length === 0) return null;

        return (
          <fieldset key={severity}>
            <legend className={cn('micro-label mb-2', SEVERITY_TEXT[severity])}>
              {t(`severity_${severity}` as never)}
            </legend>

            <div className="flex flex-wrap gap-2">
              {inGroup.map((type) => {
                const isOn = selectedCodes.has(type.code);
                const TypeIcon = advisoryIcon(type.icon);

                return (
                  <button
                    key={type.code}
                    type="button"
                    onClick={() => toggle(type.code)}
                    aria-pressed={isOn}
                    className={chipClasses({ active: isOn })}
                  >
                    <TypeIcon size={15} weight={isOn ? 'fill' : 'regular'} />
                    {labelFor(type)}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {value.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-sand-200 pt-4 dark:border-sand-800">
          <span className="micro-label">{t('selectedLabel', { count: value.length })}</span>

          <ul className="flex flex-col divide-y divide-sand-200 dark:divide-sand-800">
            {value.map((entry) => {
              const type = byCode.get(entry.code);
              if (!type) return null;

              const isOpen = opened.has(entry.code) || entry.note.length > 0;
              const TypeIcon = advisoryIcon(type.icon);

              return (
                <li key={entry.code} className="py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-sand-800 dark:text-sand-200">
                      <TypeIcon
                        size={15}
                        weight="fill"
                        className={cn('shrink-0', SEVERITY_TEXT[type.severity])}
                      />
                      <span className="truncate">{labelFor(type)}</span>
                    </span>

                    {isOpen ? (
                      <button
                        type="button"
                        onClick={() => closeNote(entry.code)}
                        className="shrink-0 rounded-full p-1 text-sand-400 transition-colors hover:bg-sand-100 hover:text-sand-700 dark:hover:bg-sand-800 dark:hover:text-sand-200"
                        aria-label={t('removeDetail')}
                      >
                        <X size={14} weight="bold" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openNote(entry.code)}
                        className="link inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
                      >
                        <Plus size={12} weight="bold" />
                        {t('addDetail')}
                      </button>
                    )}
                  </div>

                  {isOpen && (
                    <input
                      type="text"
                      value={entry.note}
                      onChange={(e) => setNote(entry.code, e.target.value)}
                      maxLength={200}
                      autoFocus={opened.has(entry.code) && entry.note.length === 0}
                      placeholder={t('notePlaceholder')}
                      className={cn(controlClasses, 'mt-2 h-9')}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
