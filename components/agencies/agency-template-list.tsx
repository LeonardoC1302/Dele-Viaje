'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, PencilSimple, FileArrowUp, Trash } from '@phosphor-icons/react';
import { Link, useRouter } from '@/i18n/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export interface AgencyTemplateData {
  id: string;
  name: string;
}

function DeleteTemplateButton({ agencyId, templateId }: { agencyId: string; templateId: string }) {
  const t = useTranslations('agencies');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/agencies/${agencyId}/templates/${templateId}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t('templateDeleteError'));
      setLoading(false);
      return;
    }
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={t('templateDelete')}
          title={t('templateDelete')}
          className="flex h-7 w-7 items-center justify-center rounded text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          <Trash size={14} weight="regular" strokeWidth={1.5} />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
        <DialogDescription>{t('templateDeleteConfirmBody')}</DialogDescription>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" size="md" isLoading={loading} onClick={handleDelete}>
            {t('confirmDeleteConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AgencyTemplateList({
  agencyId,
  initialTemplates,
}: {
  agencyId: string;
  initialTemplates: AgencyTemplateData[];
}) {
  const t = useTranslations('agencies');

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('templatesTitle')}</h2>
        <Link
          href={`/agencies/${agencyId}/templates/new`}
          className={buttonVariants({ size: 'xs', variant: 'secondary' })}
        >
          <Plus size={14} weight="bold" />
          {t('templateCreate')}
        </Link>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{t('templatesHelper')}</p>

      {initialTemplates.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('templatesEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {initialTemplates.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-neutral-900 dark:text-neutral-100">
                {template.name}
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/agencies/${agencyId}/tours/new?template=${template.id}`}
                  className={buttonVariants({ size: 'xs', variant: 'outline' })}
                >
                  <FileArrowUp size={14} weight="regular" strokeWidth={1.5} />
                  {t('templateUse')}
                </Link>
                <Link
                  href={`/agencies/${agencyId}/templates/${template.id}/edit`}
                  aria-label={t('templateEdit')}
                  title={t('templateEdit')}
                  className="flex h-7 w-7 items-center justify-center rounded text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                >
                  <PencilSimple size={14} weight="regular" strokeWidth={1.5} />
                </Link>
                <DeleteTemplateButton agencyId={agencyId} templateId={template.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
