'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface TripCustomFieldInput {
  id: string;
  label: string;
  value: string;
}

interface CustomFieldsEditorProps {
  fields: TripCustomFieldInput[];
  onChange: (fields: TripCustomFieldInput[]) => void;
}

export function CustomFieldsEditor({ fields, onChange }: CustomFieldsEditorProps) {
  const t = useTranslations('trips');

  const addField = () => {
    onChange([...fields, { id: crypto.randomUUID(), label: '', value: '' }]);
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
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {t('customFieldsLabel')}
        </label>
        <Button type="button" size="xs" variant="secondary" onClick={addField}>
          <Plus size={14} weight="bold" />
          {t('customFieldsAdd')}
        </Button>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">{t('customFieldsHelper')}</p>

      {fields.length > 0 && (
        <ul className="flex flex-col gap-2">
          {fields.map((field) => (
            <li key={field.id} className="flex items-center gap-2">
              <Input
                placeholder={t('customFieldLabelPlaceholder')}
                value={field.label}
                onChange={(e) => updateField(field.id, { label: e.target.value })}
                className="h-9 w-36 shrink-0"
                maxLength={60}
              />
              <Input
                placeholder={t('customFieldValuePlaceholder')}
                value={field.value}
                onChange={(e) => updateField(field.id, { value: e.target.value })}
                className="h-9 min-w-0 flex-1"
                maxLength={200}
              />
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => removeField(field.id)}
                aria-label={t('customFieldRemove')}
                className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
              >
                <Trash size={14} weight="regular" strokeWidth={1.5} />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
