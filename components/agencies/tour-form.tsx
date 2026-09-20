'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select } from '@/components/ui/select';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Button } from '@/components/ui/button';
import {
  TripMapEditor,
  type TripWaypointInput,
} from '@/components/trips/trip-map-editor';
import { CustomFieldsEditor, type TripCustomFieldInput } from '@/components/trips/custom-fields-editor';
import { LinksEditor, type TripLinkInput } from '@/components/trips/links-editor';
import { CATEGORY_KEYS } from '@/lib/constants/categories';
import { extractErrorMessage } from '@/lib/format-validation-error';

type Status = 'idle' | 'loading' | 'error';

export interface TourFormInitialValues {
  title: string;
  description: string;
  category: string;
  locationName: string;
  lat: number | null;
  lng: number | null;
  waypoints: { label: string; lat: number; lng: number; kind: TripWaypointInput['kind'] }[];
  customFields: { label: string; value: string }[];
  links: { url: string; label: string }[];
  startAt: string;
  endAt: string;
  capacity: number;
  minParticipants: number | null;
  priceCrc: number;
}

interface TourFormProps {
  agencyId: string;
  mode?: 'create' | 'edit';
  tripId?: string;
  initialValues?: TourFormInitialValues;
}

// A dedicated form rather than TripForm + a "tour mode" — tours submit to
// a different endpoint (POST /api/agencies/[id]/tours, authorized by
// agency staff membership, not owner_id), always publish through a
// separate step instead of immediately, and have no visibility choice
// (always public) but do have required price/capacity fields TripForm
// doesn't. Shares the same sub-components (map editor, custom fields,
// links, markdown editor) rather than duplicating those. Edits go through
// the generic PATCH /api/trips/[id] (which branches on trip.type) rather
// than a second agency-scoped route — no agency-specific logic is needed
// once you're already allowed to touch the row.
export function TourForm({ agencyId, mode = 'create', tripId, initialValues }: TourFormProps) {
  const t = useTranslations('agencies');
  const tTrips = useTranslations('trips');
  const tCategories = useTranslations('categories');
  const router = useRouter();

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
  const [links, setLinks] = useState<TripLinkInput[]>(
    initialValues?.links.map((l) => ({ id: crypto.randomUUID(), ...l })) ?? []
  );
  const [startAt, setStartAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.startAt) : null
  );
  const [endAt, setEndAt] = useState<Date | null>(initialValues ? new Date(initialValues.endAt) : null);
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

    if (!startAt || !endAt) {
      setError(tTrips('genericError'));
      setStatus('error');
      return;
    }

    const isEdit = mode === 'edit' && tripId;
    const res = await fetch(isEdit ? `/api/trips/${tripId}` : `/api/agencies/${agencyId}/tours`, {
      method: isEdit ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        locationName,
        lat,
        lng,
        waypoints: waypoints
          .filter((wp) => wp.lat != null && wp.lng != null && wp.label.trim())
          .map((wp) => ({ label: wp.label.trim(), lat: wp.lat, lng: wp.lng, kind: wp.kind })),
        customFields: customFields
          .filter((f) => f.label.trim() && f.value.trim())
          .map((f) => ({ label: f.label.trim(), value: f.value.trim() })),
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined })),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        capacity: capacity ? Number(capacity) : undefined,
        minParticipants: minParticipants ? Number(minParticipants) : null,
        priceCrc: priceCrc ? Number(priceCrc) : undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(extractErrorMessage(body, tTrips('genericError')));
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
      className="w-full max-w-[560px] rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {mode === 'edit' ? t('tourEditTitle') : t('tourNewTitle')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {mode === 'edit' ? t('tourEditSubtitle') : t('tourNewSubtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-5">
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

        <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

        <LinksEditor links={links} onChange={setLinks} />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <DateTimeField
            label={tTrips('startLabel')}
            value={startAt}
            onChange={setStartAt}
            minDate={new Date()}
            required
          />
          <DateTimeField
            label={tTrips('endLabel')}
            value={endAt}
            onChange={setEndAt}
            minDate={startAt ?? new Date()}
            required
          />
        </div>

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

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={status === 'loading'}>
            {mode === 'edit' ? t('tourSaveChanges') : t('tourCreate')}
          </Button>
          <Link
            href={mode === 'edit' && tripId ? `/trips/${tripId}` : `/agencies/${agencyId}/panel`}
            className="text-sm font-medium text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}
