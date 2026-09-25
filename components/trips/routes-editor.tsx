'use client';

import { useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Path, Trash, UploadSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Select } from '@/components/ui/select';

export interface TripRouteInput {
  id: string;
  name: string;
  stopSort: number | null;
  coordinates: [number, number][];
  profile: [number, number][] | null;
  distanceM: number;
  ascentM: number | null;
  descentM: number | null;
  minEleM: number | null;
  maxEleM: number | null;
  pointCount: number;
}

/** Mirrors `routes: z.array(tripRouteSchema).max(5)` in the validators. */
const MAX_ROUTES = 5;
const NO_STOP = 'none';

/**
 * Attaches hiking routes to a trip by importing GPX files.
 *
 * The file is sent to /api/gpx/parse and comes back measured; nothing is
 * stored until the trip itself is saved, so this works identically
 * whether the trip already exists or is being created right now.
 *
 * Only the name and the linked stop are editable afterwards. Everything
 * else is measurement, and letting a host retype their own elevation
 * gain would turn a fact into a claim.
 */
export function RoutesEditor({
  routes,
  onChange,
  stops,
}: {
  routes: TripRouteInput[];
  onChange: (routes: TripRouteInput[]) => void;
  /** The trip's stops, in form order — index is the `sort` that gets stored. */
  stops: { label: string }[];
}) {
  const t = useTranslations('routes');
  const format = useFormatter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const namedStops = stops
    .map((stop, index) => ({ index, label: stop.label.trim() }))
    .filter((stop) => stop.label.length > 0);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires.
    event.target.value = '';
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/gpx/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/gpx+xml' },
        body: await file.text(),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const code = body?.error?.code as string | undefined;
        setError(
          code === 'ERR_GPX_TOO_LARGE'
            ? t('errorTooLarge')
            : code === 'ERR_RATE_LIMITED'
              ? t('errorRateLimited')
              : code === 'ERR_GPX_EMPTY'
                ? t('errorEmpty')
                : t('errorInvalid')
        );
        return;
      }

      const parsed = body.route;
      onChange([
        ...routes,
        {
          id: crypto.randomUUID(),
          // Fall back to the filename when the file carries no track
          // name — plenty of exporters omit it.
          name: parsed.name || file.name.replace(/\.gpx$/i, '').slice(0, 160) || t('untitled'),
          stopSort: null,
          coordinates: parsed.coordinates,
          profile: parsed.profile,
          distanceM: parsed.stats.distanceM,
          ascentM: parsed.stats.ascentM,
          descentM: parsed.stats.descentM,
          minEleM: parsed.stats.minEleM,
          maxEleM: parsed.stats.maxEleM,
          pointCount: parsed.pointCount,
        },
      ]);
    } catch {
      setError(t('errorInvalid'));
    } finally {
      setBusy(false);
    }
  };

  const update = (id: string, patch: Partial<TripRouteInput>) => {
    onChange(routes.map((route) => (route.id === id ? { ...route, ...patch } : route)));
  };

  const remove = (id: string) => {
    onChange(routes.filter((route) => route.id !== id));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-sand-900 dark:text-sand-100">
          {t('editorLabel')}
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".gpx,application/gpx+xml,application/xml,text/xml"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          size="xs"
          variant="secondary"
          isLoading={busy}
          disabled={routes.length >= MAX_ROUTES}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadSimple size={14} weight="bold" />
          {t('editorAdd')}
        </Button>
      </div>
      <p className="text-xs text-sand-600 dark:text-sand-400">{t('editorHelper')}</p>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {routes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {routes.map((route) => (
            <li
              key={route.id}
              className="rounded-md border border-sand-200 p-2.5 dark:border-sand-800"
            >
              <div className="flex items-center gap-2">
                <Path
                  size={16}
                  weight="regular"
                  className="shrink-0 text-forest-600 dark:text-forest-400"
                  aria-hidden="true"
                />
                <Input
                  value={route.name}
                  onChange={(e) => update(route.id, { name: e.target.value })}
                  aria-label={t('editorName')}
                  wrapperClassName="min-w-0 grow"
                  className="h-9"
                  maxLength={160}
                />
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => remove(route.id)}
                  aria-label={t('editorRemove')}
                  className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash size={14} weight="regular" strokeWidth={1.5} />
                </Button>
              </div>

              {/* Measured, not entered — shown so the host can tell at a
                  glance that they imported the file they meant to. */}
              <p className="tnum mt-1.5 pl-6 text-xs text-sand-500 dark:text-sand-400">
                {format.number(route.distanceM / 1000, { maximumFractionDigits: 1 })} km
                {route.ascentM !== null && <> · ↑ {format.number(route.ascentM)} m</>}
                {route.descentM !== null && <> · ↓ {format.number(route.descentM)} m</>}
                {' · '}
                {t('pointCount', { count: route.pointCount })}
              </p>

              {namedStops.length > 0 && (
                <div className="mt-2 pl-6">
                  <Select
                    label={t('editorStop')}
                    // Radix rejects an empty string as an item value, so
                    // "no stop" needs a sentinel of its own.
                    value={route.stopSort === null ? NO_STOP : String(route.stopSort)}
                    onValueChange={(value) =>
                      update(route.id, { stopSort: value === NO_STOP ? null : Number(value) })
                    }
                    options={[
                      { value: NO_STOP, label: t('editorNoStop') },
                      ...namedStops.map((stop) => ({
                        value: String(stop.index),
                        label: stop.label,
                      })),
                    ]}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
