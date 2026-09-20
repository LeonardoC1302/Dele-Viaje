'use client';

import { useTranslations } from 'next-intl';
import { Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface TripLinkInput {
  id: string;
  url: string;
  label: string;
}

interface LinksEditorProps {
  links: TripLinkInput[];
  onChange: (links: TripLinkInput[]) => void;
}

export function LinksEditor({ links, onChange }: LinksEditorProps) {
  const t = useTranslations('trips');

  const addLink = () => {
    onChange([...links, { id: crypto.randomUUID(), url: '', label: '' }]);
  };

  const updateLink = (id: string, patch: Partial<TripLinkInput>) => {
    onChange(links.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const removeLink = (id: string) => {
    onChange(links.filter((l) => l.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {t('linksLabel')}
        </label>
        <Button type="button" size="xs" variant="secondary" onClick={addLink}>
          <Plus size={14} weight="bold" />
          {t('linksAdd')}
        </Button>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400">{t('linksHelper')}</p>

      {links.length > 0 && (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li key={link.id} className="flex items-center gap-2">
              <Input
                placeholder={t('linkLabelPlaceholder')}
                value={link.label}
                onChange={(e) => updateLink(link.id, { label: e.target.value })}
                className="h-9 w-32 shrink-0"
                maxLength={160}
              />
              <Input
                type="url"
                placeholder={t('linkUrlPlaceholder')}
                value={link.url}
                onChange={(e) => updateLink(link.id, { url: e.target.value })}
                className="h-9 min-w-0 flex-1"
                maxLength={2000}
              />
              <Button
                type="button"
                size="xs"
                variant="ghost"
                onClick={() => removeLink(link.id)}
                aria-label={t('linkRemove')}
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
