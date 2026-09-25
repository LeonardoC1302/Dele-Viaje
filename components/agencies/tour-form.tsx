'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash, NotePencil, MapPin, Sliders, CalendarBlank, Ticket } from '@phosphor-icons/react';
import { useRouter, Link } from '@/i18n/navigation';
import { Input } from '@/components/ui/field';
import { MarkdownEditor } from '@/components/ui/markdown-editor';
import { Select } from '@/components/ui/select';
import { DateTimeField } from '@/components/ui/date-time-field';
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
import { RoutesEditor, type TripRouteInput } from '@/components/trips/routes-editor';
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
  customFields: { label: string; value: string; icon?: string | null }[];
  advisories: { code: string; note: string }[];
  // Optional: a tour prefilled from a template has no routes, since
  // templates don't carry them (see migration 0037).
  routes?: Omit<TripRouteInput, 'id'>[];
  links: { url: string; label: string }[];
  startAt: string;
  endAt: string;
  capacity: number;
  minParticipants: number | null;
  priceCrc: number;
  exclusiveContent: string;
}

// What a template prefills: everything except the dates, since those are
// exactly what differs between runs of the same tour.
export type TourTemplateValues = Omit<TourFormInitialValues, 'startAt' | 'endAt'>;

interface TourFormProps {
  agencyId: string;
  mode?: 'create' | 'edit';
  tripId?: string;
  initialValues?: TourFormInitialValues;
  templateValues?: TourTemplateValues;
  /** Seeded taxonomy from trip_advisory_types, fetched server-side. */
  advisoryTypes?: AdvisoryType[];
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
export function TourForm({
  agencyId,
  mode = 'create',
  tripId,
  initialValues,
  templateValues,
  advisoryTypes = [],
}: TourFormProps) {
  const t = useTranslations('agencies');
  const tTrips = useTranslations('trips');
  const tCategories = useTranslations('categories');
  const tRoutes = useTranslations('routes');
  const router = useRouter();

  // A template only prefills in create mode — startAt/endAt are never part
  // of it, so those two always start blank even when coming from a
  // template (dates are exactly what's different this time around).
  const prefill = initialValues ?? templateValues;

  const [title, setTitle] = useState(prefill?.title ?? '');
  const [description, setDescription] = useState(prefill?.description ?? '');
  const [category, setCategory] = useState<string>(prefill?.category ?? CATEGORY_KEYS[0]);
  const [locationName, setLocationName] = useState(prefill?.locationName ?? '');
  const [lat, setLat] = useState<number | null>(prefill?.lat ?? null);
  const [lng, setLng] = useState<number | null>(prefill?.lng ?? null);
  const [waypoints, setWaypoints] = useState<TripWaypointInput[]>(
    prefill?.waypoints.map((wp) => ({ id: crypto.randomUUID(), ...wp })) ?? []
  );
  const [customFields, setCustomFields] = useState<TripCustomFieldInput[]>(
    prefill?.customFields.map((f) => ({
      id: crypto.randomUUID(),
      ...f,
      icon: f.icon ?? null,
    })) ?? []
  );
  const [advisories, setAdvisories] = useState<AdvisoryInput[]>(prefill?.advisories ?? []);
  const [routes, setRoutes] = useState<TripRouteInput[]>(
    prefill?.routes?.map((route) => ({ id: crypto.randomUUID(), ...route })) ?? []
  );
  const [links, setLinks] = useState<TripLinkInput[]>(
    prefill?.links.map((l) => ({ id: crypto.randomUUID(), ...l })) ?? []
  );
  const [startAt, setStartAt] = useState<Date | null>(
    initialValues ? new Date(initialValues.startAt) : null
  );
  const [endAt, setEndAt] = useState<Date | null>(initialValues ? new Date(initialValues.endAt) : null);
  const [capacity, setCapacity] = useState(prefill ? String(prefill.capacity) : '');
  const [minParticipants, setMinParticipants] = useState(
    prefill?.minParticipants != null ? String(prefill.minParticipants) : ''
  );
  const [priceCrc, setPriceCrc] = useState(prefill ? String(prefill.priceCrc) : '');
  const [exclusiveContent, setExclusiveContent] = useState(prefill?.exclusiveContent ?? '');
  const [additionalDates, setAdditionalDates] = useState<
    { id: string; startAt: Date | null; endAt: Date | null }[]
  >([]);
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
          .map((f) => ({ label: f.label.trim(), value: f.value.trim(), icon: f.icon })),
        advisories: advisories.map((a) => ({
          code: a.code,
          note: a.note.trim() || undefined,
        })),
        routes: routes.map(({ id: _id, ...route }) => ({
          ...route,
          name: route.name.trim() || tRoutes('untitled'),
        })),
        links: links
          .filter((l) => l.url.trim())
          .map((l) => ({ url: l.url.trim(), label: l.label.trim() || undefined })),
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        capacity: capacity ? Number(capacity) : undefined,
        minParticipants: minParticipants ? Number(minParticipants) : null,
        priceCrc: priceCrc ? Number(priceCrc) : undefined,
        exclusiveContent: exclusiveContent.trim() || undefined,
        additionalDates:
          mode === 'create'
            ? additionalDates
                .filter((d) => d.startAt && d.endAt)
                .map((d) => ({ startAt: d.startAt!.toISOString(), endAt: d.endAt!.toISOString() }))
            : undefined,
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
      className="w-full max-w-[560px] rounded-md border border-sand-200 bg-[color:var(--raised)] p-8 dark:border-sand-800"
    >
      <h1 className="text-2xl font-extrabold text-sand-900 dark:text-sand-50">
        {mode === 'edit' ? t('tourEditTitle') : t('tourNewTitle')}
      </h1>
      <p className="mt-2 text-sm text-sand-600 dark:text-sand-400">
        {mode === 'edit' ? t('tourEditSubtitle') : t('tourNewSubtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-6">
        <FormSection icon={NotePencil} title={tTrips('sectionDetails')}>
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

          <RoutesEditor routes={routes} onChange={setRoutes} stops={waypoints} />
        </FormSection>

        <FormSection icon={Sliders} title={tTrips('sectionExtras')}>
          <CustomFieldsEditor fields={customFields} onChange={setCustomFields} />

          {advisoryTypes.length > 0 && (
            <AdvisoryEditor types={advisoryTypes} value={advisories} onChange={setAdvisories} />
          )}
          <LinksEditor links={links} onChange={setLinks} />
        </FormSection>

        <FormSection icon={CalendarBlank} title={tTrips('sectionSchedule')}>
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

          {mode === 'create' && (
            <div className="flex flex-col gap-3 rounded-md border border-dashed border-sand-300 p-4 dark:border-sand-700">
              <div>
                <p className="text-sm font-medium text-sand-900 dark:text-sand-100">
                  {t('tourAdditionalDatesLabel')}
                </p>
                <p className="mt-0.5 text-xs text-sand-500 dark:text-sand-400">
                  {t('tourAdditionalDatesHelper')}
                </p>
              </div>

              {additionalDates.map((entry, index) => (
                <div key={entry.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                    <DateTimeField
                      label={t('tourAdditionalDateStart', { number: index + 1 })}
                      value={entry.startAt}
                      onChange={(date) =>
                        setAdditionalDates((prev) =>
                          prev.map((d) => (d.id === entry.id ? { ...d, startAt: date } : d))
                        )
                      }
                      minDate={new Date()}
                    />
                    <DateTimeField
                      label={tTrips('endLabel')}
                      value={entry.endAt}
                      onChange={(date) =>
                        setAdditionalDates((prev) =>
                          prev.map((d) => (d.id === entry.id ? { ...d, endAt: date } : d))
                        )
                      }
                      minDate={entry.startAt ?? new Date()}
                    />
                  </div>
                  <Button
                    type="button"
                    size="xs"
                    variant="ghost"
                    className="mt-1 shrink-0 self-start text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 sm:mt-7"
                    onClick={() => setAdditionalDates((prev) => prev.filter((d) => d.id !== entry.id))}
                    aria-label={t('tourAdditionalDateRemove')}
                  >
                    <Trash size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}

              <Button
                type="button"
                size="xs"
                variant="secondary"
                className="self-start"
                onClick={() =>
                  setAdditionalDates((prev) => [...prev, { id: crypto.randomUUID(), startAt: null, endAt: null }])
                }
              >
                <Plus size={14} weight="bold" />
                {t('tourAdditionalDateAdd')}
              </Button>
            </div>
          )}

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
        </FormSection>

        <FormSection icon={Ticket} title={t('sectionPricing')}>
          <Input
            type="number"
            label={t('tourPriceLabel')}
            helperText={t('tourPriceHelper')}
            value={priceCrc}
            onChange={(e) => setPriceCrc(e.target.value)}
            required
            min={1000}
          />

          <div>
            <MarkdownEditor
              label={t('tourExclusiveContentLabel')}
              placeholder={t('tourExclusiveContentPlaceholder')}
              value={exclusiveContent}
              onChange={setExclusiveContent}
              maxLength={4000}
            />
            <p className="mt-1.5 text-xs text-sand-500 dark:text-sand-400">
              {t('tourExclusiveContentHelper')}
            </p>
          </div>
        </FormSection>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" size="lg" isLoading={status === 'loading'}>
            {mode === 'edit' ? t('tourSaveChanges') : t('tourCreate')}
          </Button>
          <Link
            href={mode === 'edit' && tripId ? `/trips/${tripId}` : `/agencies/${agencyId}/panel`}
            className="text-sm font-medium text-sand-600 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </form>
  );
}
