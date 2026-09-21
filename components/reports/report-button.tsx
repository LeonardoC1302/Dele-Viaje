'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Flag } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/field';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { REPORT_REASONS, type CreateReportInput } from '@/lib/validators/report';

interface ReportButtonProps {
  targetType: CreateReportInput['targetType'];
  targetId: string;
  className?: string;
  label?: string;
  ariaLabel?: string;
}

export function ReportButton({
  targetType,
  targetId,
  className,
  label,
  ariaLabel,
}: ReportButtonProps) {
  const t = useTranslations('reports');
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const reasonOptions = REPORT_REASONS.map((r) => ({
    value: r,
    label: t(`reasons.${r}`),
  }));

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setReason('');
      setDescription('');
      setError(null);
      setSubmitted(false);
    }
  };

  const handleSubmit = async () => {
    if (!reason) {
      setError(t('reasonRequired'));
      return;
    }

    setLoading(true);
    setError(null);

    const res = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError(t('submitError'));
      return;
    }

    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? (label || t('report'))}
          className={
            className ??
            'flex items-center gap-1.5 text-sm font-medium text-sand-500 hover:text-red-600 dark:text-sand-400 dark:hover:text-red-400'
          }
        >
          <Flag size={16} weight="regular" strokeWidth={1.5} />
          {label ?? t('report')}
        </button>
      </DialogTrigger>
      <DialogContent>
        {submitted ? (
          <>
            <DialogTitle>{t('thanksTitle')}</DialogTitle>
            <DialogDescription>{t('thanksBody')}</DialogDescription>
            <div className="mt-6 flex justify-end">
              <Button size="md" onClick={() => handleOpenChange(false)}>
                {t('close')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>{t('description')}</DialogDescription>
            <div className="mt-4 flex flex-col gap-4">
              <Select
                label={t('reasonLabel')}
                required
                placeholder={t('reasonPlaceholder')}
                value={reason}
                onValueChange={setReason}
                options={reasonOptions}
              />
              <Textarea
                label={t('detailsLabel')}
                placeholder={t('detailsPlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => handleOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                variant="destructive"
                size="md"
                isLoading={loading}
                onClick={handleSubmit}
              >
                {t('submit')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
