'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Buildings, CurrencyCircleDollar } from '@phosphor-icons/react';
import { Input } from '@/components/ui/field';
import { Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { extractErrorMessage } from '@/lib/format-validation-error';

export interface AgencyProfileInitialValues {
  businessName: string;
  legalName: string;
  legalId: string;
  description: string;
  locationName: string;
  sinpePhone: string;
}

interface AgencyApplyFormProps {
  mode?: 'apply' | 'edit';
  agencyId?: string;
  initialValues?: AgencyProfileInitialValues;
}

export function AgencyApplyForm({ mode = 'apply', agencyId, initialValues }: AgencyApplyFormProps) {
  const t = useTranslations('agencies');
  const router = useRouter();

  const [businessName, setBusinessName] = useState(initialValues?.businessName ?? '');
  const [legalName, setLegalName] = useState(initialValues?.legalName ?? '');
  const [legalId, setLegalId] = useState(initialValues?.legalId ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [locationName, setLocationName] = useState(initialValues?.locationName ?? '');
  const [sinpePhone, setSinpePhone] = useState(initialValues?.sinpePhone ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const isEdit = mode === 'edit' && agencyId;
    const res = await fetch(isEdit ? `/api/agencies/${agencyId}` : '/api/agencies', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName,
        legalName: legalName.trim() || undefined,
        legalId: legalId.trim() || undefined,
        description: description.trim() || undefined,
        locationName: locationName.trim() || undefined,
        sinpePhone: sinpePhone.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, t('applyError')));
      setLoading(false);
      return;
    }

    const id = isEdit ? agencyId : (await res.json()).id;
    router.push(`/agencies/${id}/panel`);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[560px] rounded-md border border-sand-200 bg-[color:var(--raised)] p-8 dark:border-sand-800"
    >
      <h1 className="text-2xl font-extrabold text-sand-900 dark:text-sand-50">
        {mode === 'edit' ? t('editProfileTitle') : t('applyTitle')}
      </h1>
      <p className="mt-2 text-sm text-sand-600 dark:text-sand-400">
        {mode === 'edit' ? t('editProfileSubtitle') : t('applySubtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <FormSection icon={Buildings} title={t('sectionBusiness')}>
          <Input
            label={t('businessNameLabel')}
            placeholder={t('businessNamePlaceholder')}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />
          <Input
            label={t('legalNameLabel')}
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            maxLength={160}
          />
          <Input
            label={t('legalIdLabel')}
            helperText={t('legalIdHelper')}
            value={legalId}
            onChange={(e) => setLegalId(e.target.value)}
            maxLength={60}
          />
          <Textarea
            label={t('descriptionLabel')}
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
          />
          <Input
            label={t('locationLabel')}
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            maxLength={160}
          />
        </FormSection>

        <FormSection icon={CurrencyCircleDollar} title={t('sectionPayments')}>
          <Input
            label={t('sinpePhoneLabel')}
            helperText={t('sinpePhoneHelper')}
            placeholder="8888-8888"
            value={sinpePhone}
            onChange={(e) => setSinpePhone(e.target.value)}
            maxLength={20}
          />
        </FormSection>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={loading}>
            {mode === 'edit' ? t('editProfileSave') : t('applySubmit')}
          </Button>
          <Link
            href={mode === 'edit' && agencyId ? `/agencies/${agencyId}/panel` : '/feed'}
            className="text-sm font-medium text-sand-600 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}
