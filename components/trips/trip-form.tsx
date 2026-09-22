'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { NotePencil, MapPin, Sliders, CalendarBlank } from '@phosphor-icons/react';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/field';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select } from '@/components/ui/select';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Button } from '@/components/ui/button';
import { FormSection } from '@/components/ui/form-section';
import { AdvisoryEditor, type AdvisoryInput } from '@/components/trips/advisory-editor';
import type { AdvisoryType } from '@/lib/constants/advisories';
import {
  TripMapEditor,
  type TripWaypointInput,
  type TripWaypointKind,
} from '@/components/trips/trip-map-editor';
import { CustomFieldsEditor, type TripCustomFieldInput } from '@/components/trips/custom-fields-editor';
import { LinksEditor, type TripLinkInput } from '@/components/trips/links-editor';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { extractErrorMessage } from '@/lib/format-validation-error';
import { cn } from '@/lib/utils';

type Status = 'idle' | 'loading' | 'error';

export interface TripFormInitialValues {
  title: string;
  description: string;
  category: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  waypoints: { label: string; lat: number; lng: number; kind: TripWaypointKind }[];
  customFields: { label: string; value: string }[];
  links: { url: string; label: string }[];
  advisories: { code: string; note: string }[];
  startAt: string;
  endAt: string;
  capacity: number | null;
}

interface TripFormProps {
  mode?: 'create' | 'edit';
  tripId?: string;
  initialValues?: TripFormInitialValues;
  /** Seeded taxonomy, fetched server-side so an admin can extend it without a deploy. */
  advisoryTypes?: AdvisoryType[];
}

export function TripForm({
  mode = 'create',
  tripId,
  initialValues,
  advisoryTypes = [],
}: TripFormProps) {
  const t = useTranslations('trips');
  const tCategories = useTranslations('categories');
  const router = useRouter();

  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [category, setCategory] = useState<string>(initialValues?.category ?? CATEGORY_KEYS[0]);
  const [locationName, setLocationName] = useState(initialValues?.locationName ?? '');
  const [lat, setLat] = useState<number | null>(initialValues?.lat ?? null);
  const [lng, setLng] = useState<number | null>(initialValues?.lng ?? null);
  const [waypoints, setWaypoints] = useState<TripWaypointInput[]>(
    initialValues?.waypoints.map((wp) => ({ id: crypto.randomUUID(), ...wp })) ?? []
  );
  const [customFields, setCustomFields] = useState<TripCustomFieldInput[]>(
    initialValues?.customFields.map((f) => ({ id: crypto.randomUUID(), ...f })) ?? []
  );
  const [advisories, setAdvisories] = useState<AdvisoryInput[]>(
    initialValues?.advisories ?? []
  );
  const [links, setLinks] = useState<TripLinkInput[]>(
    initialValues?.links.map((l) => ({ id: crypto.randomUUID(), ...l })) ?? []
  );
  const [startAt, setStartAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.startAt) : null
  );
  const [endAt, setEndAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.endAt) : null
  );
  const [capacity, setCapacity] = useState(
    initialValues?.capacity != null ? String(initialValues.capacity) : ''
  );
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

    if (!startAt || !endAt) {
      setError(t('genericError'));
      setStatus('error');
      return;
    }

    if (endAt <= startAt) {
      setError(t('endBeforeStart'));
      setStatus('error');
      return;
    }

    const isEdit = mode === 'edit' && tripId;
    const res = await fetch(isEdit ? `/api/trips/${tripId}` : '/api/trips', {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        visibility,
        locationName,
        lat,
        lng,
        waypoints: waypoints
          .filter((wp) => wp.lat != null && wp.lng != null && wp.label.trim())
          .map((wp) => ({ label: wp.label.trim(), lat: wp.lat, lng: wp.lng, kind: wp.kind })),
        customFields: customFields
          .filter((f) => f.label.trim() && f.value.trim())
          .map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
        advisories: advisories.map((a) => ({
          code: a.code,
          note: a.note.trim() || undefined,
        })),
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined })),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        capacity: capacity ? Number(capacity) : null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const code = body?.error?.code;
      setError(
        code === 'ERR_ACCOUNT_NOT_ACTIVE'
          ? t('accountNotActive')
          : extractErrorMessage(body, t('genericError'))
      );
      setStatus('error');
      return;
    }

    const id = isEdit ? tripId : (await res.json()).id;
    router.push(`/trips/${id}`);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[560px] rounded-md border border-sand-200 bg-[color:var(--raised)] p-8 dark:border-sand-800"
    >
      <h1 className="text-2xl font-extrabold text-sand-900 dark:text-sand-50">
        {mode === 'edit' ? t('editTitle') : t('newTitle')}
      </h1>
      <p className="mt-2 text-sm text-sand-600 dark:text-sand-400">
        {mode === 'edit' ? t('editSubtitle') : t('newSubtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <FormSection icon={NotePencil} title={t('sectionDetails')}>
          {mode === 'create' && (
            <div>
              <label className="text-sm font-medium text-sand-900 dark:text-sand-100">
                {t('visibilityLabel')}
              </label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setVisibility('public')}
                  className={cn(
                    'rounded-md border-2 p-3 text-left transition-colors',
                    visibility === 'public'
                      ? 'border-forest-600 bg-forest-50 dark:bg-forest-950'
                      : 'border-sand-200 hover:bg-sand-50 dark:border-sand-800 dark:hover:bg-sand-900'
                  )}
                >
                  <p className="text-sm font-semibold text-sand-900 dark:text-sand-100">
                    {t('visibilityPublicLabel')}
                  </p>
                  <p className="mt-0.5 text-xs text-sand-600 dark:text-sand-400">
                    {t('visibilityPublicHelper')}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'rounded-md border-2 p-3 text-left transition-colors',
                    visibility === 'private'
                      ? 'border-forest-600 bg-forest-50 dark:bg-forest-950'
                      : 'border-sand-200 hover:bg-sand-50 dark:border-sand-800 dark:hover:bg-sand-900'
                  )}
                >
                  <p className="text-sm font-semibold text-sand-900 dark:text-sand-100">
                    {t('visibilityPrivateLabel')}
                  </p>
                  <p className="mt-0.5 text-xs text-sand-600 dark:text-sand-400">
                    {t('visibilityPrivateHelper')}
                  </p>
                </button>
              </div>
            </div>
          )}

          <Input
            label={t('titleLabel')}
            placeholder={t('titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
            maxLength={120}
          />

          <MarkdownEditor
            label={t('descriptionLabel')}
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={setDescription}
            required
            maxLength={4000}
          />

          <Select
            label={t('categoryLabel')}
            value={category}
            onValueChange={setCategory}
            options={categoryOptions}
            required
          />
        </FormSection>

        <FormSection icon={MapPin} title={t('sectionLocation')}>
          <Input
            label={t('locationLabel')}
            placeholder={t('locationPlaceholder')}
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

        <FormSection icon={Sliders} title={t('sectionExtras')}>
          <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

          {advisoryTypes.length > 0 && (
            <AdvisoryEditor
              types={advisoryTypes}
              value={advisories}
              onChange={setAdvisories}
            />
          )}
          <LinksEditor links={links} onChange={setLinks} />
        </FormSection>

        <FormSection icon={CalendarBlank} title={t('sectionSchedule')}>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <DateTimeField
              label={t('startLabel')}
              value={startAt}
              onChange={setStartAt}
              minDate={new Date()}
              required
            />
            <DateTimeField
              label={t('endLabel')}
              value={endAt}
              onChange={setEndAt}
              minDate={startAt ?? new Date()}
              required
            />
          </div>

          <Input
            type="number"
            label={t('capacityLabel')}
            helperText={t('capacityHelper')}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            min={1}
            max={500}
          />
        </FormSection>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button type="submit" size="lg" isLoading={status === 'loading'}>
          {mode === 'edit' ? t('saveChanges') : t('submit')}
        </Button>
      </div>
    </form>
  );
}
