'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trash } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';

export function DeleteTripButton({ tripId, redirectTo = '/my-trips' }: { tripId: string; redirectTo?: string }) {
  const t = useTranslations('trips');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/trips/${tripId}`, { method: 'DELETE' });
    if (!res.ok) {
      setError(t('deleteTripError'));
      setLoading(false);
      return;
    }
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <Trash size={16} weight="regular" strokeWidth={1.5} />
          {t('deleteTrip')}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{t('confirmDeleteTitle')}</DialogTitle>
        <DialogDescription>{t('confirmDeleteBody')}</DialogDescription>
        {error && (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" size="md" onClick={() => setOpen(false)}>
            {t('confirmDeleteCancel')}
          </Button>
          <Button
            variant="destructive"
            size="md"
            isLoading={loading}
            onClick={handleDelete}
          >
            {t('confirmDeleteConfirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
