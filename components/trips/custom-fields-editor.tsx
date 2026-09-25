'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { CustomFieldIconPicker } from '@/components/trips/custom-field-icon-picker';

export interface TripCustomFieldInput {
  id: string;
  label: string;
  value: string;
  icon: string | null;
}

interface CustomFieldsEditorProps {
  fields: TripCustomFieldInput[];
  onChange: (fields: TripCustomFieldInput[]) => void;
}

export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
  const t = useTranslations('trips');

  const addField = () => {
    onChange([...fields, { id: crypto.randomUUID(), label: '', value: '', icon: null }]);
  };

  const updateField = (id: string, patch: Partial<TripCustomFieldInput>) => {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-sand-900 dark:text-sand-100">
          {t('customFieldsLabel')}
        </label>
        <Button type="button" size="xs" variant="secondary" onClick={addField}>
          <Plus size={14} weight="bold" />
          {t('customFieldsAdd')}
        </Button>
      </div>
      <p className="text-xs text-sand-600 dark:text-sand-400">{t('customFieldsHelper')}</p>

      {fields.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fields.map((field) => (
            // One line from `sm` up. On a phone there isn't room for
            // icon + label + value + delete, and the value is the half
            // that matters, so it wraps to its own full-width row. The
            // delete button is in the DOM before the value and ordered
            // last from `sm` up, which keeps it on the first row on
            // mobile instead of trailing under it.
            <li key={field.id} className="flex flex-wrap items-center gap-2">
              <CustomFieldIconPicker
                value={field.icon}
                onChange={(icon) => updateField(field.id, { icon })}
              />
              <Input
                placeholder={t('customFieldLabelPlaceholder')}
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                // Sizing belongs on the wrapper — it, not the <input>,
                // is the flex child of this row.
                wrapperClassName="min-w-0 grow sm:w-36 sm:grow-0"
                className="h-9"
                maxLength={60}
              />
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => removeField(field.id)}
                aria-label={t('customFieldRemove')}
                className="shrink-0 text-red-600 hover:bg-red-50 sm:order-last dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash size={14} weight="regular" strokeWidth={1.5} />
              </Button>
              <Input
                placeholder={t('customFieldValuePlaceholder')}
                value={field.value}
                onChange={(e) => updateField(field.id, { value: e.target.value })}
                wrapperClassName="min-w-0 basis-full sm:basis-0 sm:grow"
                className="h-9"
                maxLength={200}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
