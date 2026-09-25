'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { NotePencil, MapPin, Sliders, Ticket } from '@phosphor-icons/react';
import { Input } from '@/components/ui/field';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import {
  TripMapEditor,
  type TripWaypointInput,
} from '@/components/trips/trip-map-editor';
import { CustomFieldsEditor, type TripCustomFieldInput } from '@/components/trips/custom-fields-editor';
import { AdvisoryEditor, type AdvisoryInput } from '@/components/trips/advisory-editor';
import type { AdvisoryType } from '@/lib/constants/advisories';
import { LinksEditor, type TripLinkInput } from '@/components/trips/links-editor';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { extractErrorMessage } from '@/lib/format-validation-error';
import type { TourTemplateValues } from '@/components/agencies/tour-form';

type Status = 'idle' | 'loading' | 'error';

// Templates don't carry exclusiveContent — that's tied to a specific
// tour's paid attendees (migration 0030), not something that makes sense
// to pre-fill before any attendees exist yet.
type TemplateFormValues = Omit<TourTemplateValues, 'exclusiveContent'> & { name: string };

interface TourTemplateFormProps {
  agencyId: string;
  mode?: 'create' | 'edit';
  templateId?: string;
  initialValues?: TemplateFormValues;
  /** Seeded taxonomy from trip_advisory_types, fetched server-side. */
  advisoryTypes?: AdvisoryType[];
}

// Same fields as TourForm minus start/end date — a template is reused
// across different dates, so scheduling is deliberately left out of what
// it stores. Adds a `name` field TourForm doesn't have: the template's
// own label in the agency's list, kept separate from `title` (the tour's
// public title) since an agency might want to tell apart, say, two
// templates that both produce tours titled "Chirripó Sunrise Hike".
export function TourTemplateForm({
  agencyId,
  mode = 'create',
  templateId,
  initialValues,
  advisoryTypes = [],
}: TourTemplateFormProps) {
  const t = useTranslations('agencies');
  const tTrips = useTranslations('trips');
  const tCategories = useTranslations('categories');
  const router = useRouter();

  const [name, setName] = useState(initialValues?.name ?? '');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState<string>(initialValues?.category ?? CATEGORY_KEYS[0]);
  const [locationName, setLocationName] = useState(initialValues?.locationName ?? '');
  const [lat, setLat] = useState<number | null>(initialValues?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialValues?.lng ?? null);
  const [waypoints, setWaypoints] = useState<TripWaypointInput[]>(
    initialValues?.waypoints.map((wp) => ({ id: crypto.randomUUID(), ...wp })) ?? []
  );
  const [advisories, setAdvisories] = useState<AdvisoryInput[]>(initialValues?.advisories ?? []);
  const [customFields, setCustomFields] = useState<TripCustomFieldInput[]>(
    initialValues?.customFields.map((f) => ({
      id: crypto.randomUUID(),
      ...f,
      icon: f.icon ?? null,
    })) ?? []
  );
  const [links, setLinks] = useState<TripLinkInput[]>(
    initialValues?.links.map((l) => ({ id: crypto.randomUUID(), ...l })) ?? []
  );
  const [capacity, setCapacity] = useState(initialValues ? String(initialValues.capacity) : '');
  const [minParticipants, setMinParticipants] = useState(
    initialValues?.minParticipants != null ? String(initialValues.minParticipants) : ''
  );
  const [priceCrc, setPriceCrc] = useState(initialValues ? String(initialValues.priceCrc) : '');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = CATEGORY_KEYS.map((key) => ({
    value: key,
    label: tCategories(key),
  }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setError(null);

    const isEdit = mode === 'edit' && templateId;
    const res = await fetch(
      isEdit ? `/api/agencies/${agencyId}/templates/${templateId}` : `/api/agencies/${agencyId}/templates`,
      {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          title,
          description,
          category,
          locationName,
          lat,
          lng,
          waypoints: waypoints
            .filter((wp) => wp.lat != null && wp.lng != null && wp.label.trim())
            .map((wp) => ({ label: wp.label.trim(), lat: wp.lat, lng: wp.lng, kind: wp.kind })),
          advisories: advisories.map((a) => ({ code: a.code, note: a.note.trim() || undefined })),
          customFields: customFields
            .filter((f) => f.label.trim() && f.value.trim())
            .map((f) => ({ label: f.label.trim(), value: f.value.trim(), icon: f.icon })),
          links: links
            .filter((l) => l.url.trim())
            .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined })),
          capacity: capacity ? Number(capacity) : undefined,
          minParticipants: minParticipants ? Number(minParticipants) : null,
          priceCrc: priceCrc ? Number(priceCrc) : undefined,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, tTrips('genericError')));
      setStatus('error');
      return;
    }

    router.push(`/agencies/${agencyId}/panel`);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[560px] rounded-md border border-sand-200 bg-[color:var(--raised)] p-8 dark:border-sand-800"
    >
      <h1 className="text-2xl font-extrabold text-sand-900 dark:text-sand-50">
        {mode === 'edit' ? t('templateEditTitle') : t('templateNewTitle')}
      </h1>
      <p className="mt-2 text-sm text-sand-600 dark:text-sand-400">{t('templateSubtitle')}</p>

      <div className="mt-6 flex flex-col gap-6">
        <FormSection icon={NotePencil} title={tTrips('sectionDetails')}>
          <Input
            label={t('templateNameLabel')}
            helperText={t('templateNameHelper')}
            placeholder={t('templateNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />

          <Input
            label={tTrips('titleLabel')}
            placeholder={tTrips('titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />

          <MarkdownEditor
            label={tTrips('descriptionLabel')}
            placeholder={tTrips('descriptionPlaceholder')}
            value={description}
            onChange={setDescription}
            required
            maxLength={4000}
          />

          <Select
            label={tTrips('categoryLabel')}
            value={category}
            onValueChange={setCategory}
            options={categoryOptions}
            required
          />
        </FormSection>

        <FormSection icon={MapPin} title={tTrips('sectionLocation')}>
          <Input
            label={tTrips('locationLabel')}
            placeholder={tTrips('locationPlaceholder')}
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
            minLength={2}
            maxLength={160}
          />

          <TripMapEditor
            meetingPointName={locationName}
            meetingPointLat={lat}
            meetingPointLng={lng}
            onMeetingPointChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
            waypoints={waypoints}
            onWaypointsChange={setWaypoints}
          />
        </FormSection>

        <FormSection icon={Sliders} title={tTrips('sectionExtras')}>
          <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

          {advisoryTypes.length > 0 && (
            <AdvisoryEditor types={advisoryTypes} value={advisories} onChange={setAdvisories} />
          )}
          <LinksEditor links={links} onChange={setLinks} />
        </FormSection>

        <FormSection icon={Ticket} title={t('sectionPricing')}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              type="number"
              label={tTrips('capacityLabel')}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              min={1}
              max={500}
            />
            <Input
              type="number"
              label={t('tourMinParticipantsLabel')}
              helperText={t('tourMinParticipantsHelper')}
              value={minParticipants}
              onChange={(e) => setMinParticipants(e.target.value)}
              min={1}
              max={500}
            />
          </div>

          <Input
            type="number"
            label={t('tourPriceLabel')}
            helperText={t('tourPriceHelper')}
            value={priceCrc}
            onChange={(e) => setPriceCrc(e.target.value)}
            required
            min={1000}
          />
        </FormSection>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={status === 'loading'}>
            {mode === 'edit' ? t('tourSaveChanges') : t('templateCreate')}
          </Button>
          <Link
            href={`/agencies/${agencyId}/panel`}
            className="text-sm font-medium text-sand-600 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}
