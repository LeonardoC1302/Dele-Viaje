'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash, Clock, Compass } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Textarea } from '@/components/ui/field';
import { TimePicker } from '@/components/ui/time-picker';
import { PanelHeading } from '@/components/ui/panel-heading';
import { cn } from '@/lib/utils';
import { ITINERARY_ICON_KEYS, ItineraryIcon, type ItineraryIconKey } from '@/components/plans/itinerary-icons';

export interface ItineraryBlockData {
  id: string;
  dayIndex: number;
  startTime: string | null;
  label: string;
  description: string | null;
  photoUrl: string | null;
  icon: string | null;
}

interface ItineraryListProps {
  tripId: string;
  currentUserId: string;
  canAdd: boolean;
  canDelete: boolean;
  initialBlocks: ItineraryBlockData[];
}

/**
 * The stop marker — a node on the day's spine.
 *
 * This used to be a 80px-wide block glued to the left edge of a bordered
 * card, which made a day read as a stack of thumbnails rather than as a
 * route. As a round node on a connecting line it does the job the
 * content actually has: showing the order of the stops.
 */
function ItineraryThumb({ block }: { block: ItineraryBlockData }) {
  if (block.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external photo URLs can't be pre-registered in next.config.ts remotePatterns.
      <img
        src={block.photoUrl}
        alt=""
        className="relative z-10 h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[color:var(--raised)]"
      />
    );
  }
  return (
    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-forest-50 ring-2 ring-[color:var(--raised)] dark:bg-forest-600/25">
      <ItineraryIcon
        iconKey={block.icon}
        size={17}
        className="text-forest-600 dark:text-forest-400"
      />
    </div>
  );
}

export function ItineraryList({ tripId, currentUserId, canAdd, canDelete, initialBlocks }: ItineraryListProps) {
  const t = useTranslations('plans');
  const [supabase] = useState(() => createClient());
  const [blocks, setBlocks] = useState(initialBlocks);
  const [day, setDay] = useState('1');
  const [time, setTime] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [icon, setIcon] = useState<ItineraryIconKey | ''>('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const dayGroups = new Map<number, ItineraryBlockData[]>();
  for (const block of blocks) {
    const group = dayGroups.get(block.dayIndex) ?? [];
    group.push(block);
    dayGroups.set(block.dayIndex, group);
  }
  const sortedDays = [...dayGroups.keys()].sort((a, b) => a - b);
  for (const dayBlocks of dayGroups.values()) {
    dayBlocks.sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
  }

  const addBlock = async () => {
    const dayIndex = Math.max(0, Math.round(Number(day)) - 1);
    if (!label.trim() || Number.isNaN(dayIndex)) return;
    setAdding(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('itinerary_blocks')
      .insert({
        trip_id: tripId,
        day_index: dayIndex,
        start_time: time || null,
        label: label.trim(),
        description: description.trim() || null,
        photo_url: photoUrl.trim() || null,
        icon: photoUrl.trim() ? null : icon || null,
        created_by: currentUserId,
      })
      .select('id, day_index, start_time, label, description, photo_url, icon')
      .single();

    setAdding(false);

    if (insertError || !data) {
      setError(t('itineraryAddError'));
      return;
    }

    setBlocks((prev) => [
      ...prev,
      {
        id: data.id,
        dayIndex: data.day_index,
        startTime: data.start_time,
        label: data.label,
        description: data.description,
        photoUrl: data.photo_url,
        icon: data.icon,
      },
    ]);
    setTime('');
    setLabel('');
    setDescription('');
    setPhotoUrl('');
    setIcon('');
    setFormOpen(false);
  };

  const removeBlock = async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('itinerary_blocks').delete().eq('id', id);
  };

  return (
    <div className="min-w-0">
      <PanelHeading icon={Compass}>{t('itineraryTitle')}</PanelHeading>
      <p className="mt-1 text-xs text-sand-600 dark:text-sand-400">{t('itineraryHelper')}</p>

      {sortedDays.length === 0 ? (
        <p className="mt-4 text-sm text-sand-500 dark:text-sand-400">{t('itineraryEmpty')}</p>
      ) : (
        <>
          {sortedDays.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {sortedDays.map((dayIndex) => (
                <a
                  key={dayIndex}
                  href={`#itinerary-day-${dayIndex}`}
                  className="rounded-full border border-sand-300 px-2.5 py-1 text-xs font-medium text-sand-600 transition-colors hover:border-forest-600 hover:text-forest-600 dark:border-sand-700 dark:text-sand-400 dark:hover:border-forest-400 dark:hover:text-forest-400"
                >
                  {t('itineraryDay', { day: dayIndex + 1 })}
                </a>
              ))}
            </div>
          )}
          <div className="mt-4 flex flex-col gap-5">
          {sortedDays.map((dayIndex) => (
            <div key={dayIndex} id={`itinerary-day-${dayIndex}`} className="scroll-mt-24">
              <h3 className="micro-label text-forest-700 dark:text-forest-400">
                {t('itineraryDay', { day: dayIndex + 1 })}
              </h3>

              {/* A day is a route, so its stops hang off one spine. The
                  connector is drawn per item and omitted on the last,
                  which is what makes the line stop at the final node
                  instead of trailing into empty space. */}
              <ol className="mt-3">
                {dayGroups.get(dayIndex)!.map((block, i, stops) => (
                  <li key={block.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                    {i < stops.length - 1 && (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-0 left-[1.0625rem] top-9 w-px bg-sand-200 dark:bg-sand-800"
                      />
                    )}

                    <ItineraryThumb block={block} />

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {block.startTime && (
                            <p className="tnum micro-label mb-1 flex items-center gap-1 text-dawn-700 dark:text-dawn-400">
                              <Clock size={11} weight="fill" />
                              {block.startTime.slice(0, 5)}
                            </p>
                          )}
                          <p className="font-display font-semibold leading-snug text-sand-900 dark:text-sand-50">
                            {block.label}
                          </p>
                        </div>

                        {canDelete && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => removeBlock(block.id)}
                            aria-label={t('itineraryRemove')}
                            className="shrink-0 text-sand-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950 dark:hover:text-red-400"
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>

                      {block.description && (
                        <p className="mt-1.5 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
                          {block.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          ))}
          </div>
        </>
      )}

      {canAdd && !formOpen && (
        <Button size="sm" variant="secondary" className="mt-5" onClick={() => setFormOpen(true)}>
          <Plus size={14} weight="bold" />
          {t('itineraryAddStop')}
        </Button>
      )}

      {canAdd && formOpen && (
        <div className="mt-5 flex flex-col gap-3 border-t border-sand-200 pt-4 dark:border-sand-800">
          {/* `items-end` keeps every control's baseline aligned even
              when one field's label wraps to two lines. The explicit
              h-9 overrides that used to be here fought Select's h-10
              and were half of why the time control sat low. */}
          <div className="flex flex-wrap items-end gap-3">
            <Input
              type="number"
              label={t('itineraryDayLabel')}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              min={1}
              className="tnum w-20"
            />
            <TimePicker label={t('itineraryTimeLabel')} value={time} onChange={setTime} />
            <Input
              label={t('itineraryLabelLabel')}
              placeholder={t('itineraryLabelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={160}
              wrapperClassName="min-w-[180px] flex-1"
            />
          </div>
          <Textarea
            label={t('itineraryDescriptionLabel')}
            placeholder={t('itineraryDescriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-16"
          />
          <Input
            label={t('itineraryPhotoLabel')}
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            className="h-9"
          />
          <div className="flex flex-col gap-2">
            {/* Same micro-label every other field in this form uses —
                it was the only one still on text-sm. */}
            <span className="micro-label text-sand-600 dark:text-sand-400">
              {t('itineraryIconLabel')}
            </span>
            <p className="-mt-1 text-xs text-sand-500 dark:text-sand-400">
              {photoUrl.trim() ? t('itineraryIconHiddenByPhoto') : t('itineraryIconHelper')}
            </p>
            <div className="flex flex-wrap gap-2">
              {ITINERARY_ICON_KEYS.map((key) => {
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!!photoUrl.trim()}
                    onClick={() => setIcon(selected ? '' : key)}
                    aria-label={t(`itineraryIcon_${key}` as const)}
                    title={t(`itineraryIcon_${key}` as const)}
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      selected
                        ? 'border-forest-600 bg-forest-50 text-forest-600 dark:bg-forest-600/20 dark:text-forest-400'
                        : 'border-sand-300 text-sand-500 hover:bg-sand-100 dark:border-sand-700 dark:text-sand-400 dark:hover:bg-sand-800'
                    )}
                  >
                    <ItineraryIcon iconKey={key} size={16} />
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" isLoading={adding} onClick={addBlock} className="self-start">
              <Plus size={14} weight="bold" />
              {t('itineraryAdd')}
            </Button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-sm font-medium text-sand-500 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
            >
              {t('itineraryCancel')}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
