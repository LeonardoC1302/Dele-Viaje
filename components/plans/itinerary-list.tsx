'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash, Clock } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TimePicker } from '@/components/ui/time-picker';
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

function ItineraryThumb({ block }: { block: ItineraryBlockData }) {
  if (block.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary external photo URLs can't be pre-registered in next.config.ts remotePatterns.
      <img src={block.photoUrl} alt="" className="w-20 shrink-0 self-stretch object-cover" />
    );
  }
  return (
    <div className="flex w-20 shrink-0 items-center justify-center self-stretch bg-forest-50 dark:bg-forest-600/20">
      <ItineraryIcon iconKey={block.icon} size={24} className="text-forest-600 dark:text-forest-400" />
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
  };

  const removeBlock = async (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('itinerary_blocks').delete().eq('id', id);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('itineraryTitle')}
      </h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('itineraryHelper')}</p>

      {sortedDays.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('itineraryEmpty')}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {sortedDays.map((dayIndex) => (
            <div key={dayIndex}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-forest-600 dark:text-forest-400">
                {t('itineraryDay', { day: dayIndex + 1 })}
              </h3>
              <ul className="mt-2 flex flex-col gap-2">
                {dayGroups.get(dayIndex)!.map((block) => (
                  <li
                    key={block.id}
                    className="flex gap-3 overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800"
                  >
                    <ItineraryThumb block={block} />
                    <div className="min-w-0 flex-1 py-2 pr-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                          {block.label}
                        </p>
                        {canDelete && (
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => removeBlock(block.id)}
                            aria-label={t('itineraryRemove')}
                            className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                          >
                            <Trash size={14} weight="regular" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                      {block.startTime && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
                          <Clock size={12} weight="regular" strokeWidth={1.5} />
                          {block.startTime.slice(0, 5)}
                        </p>
                      )}
                      {block.description && (
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">
                          {block.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {canAdd && (
        <div className="mt-5 flex flex-col gap-3 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <div className="flex flex-wrap gap-2">
            <Input
              type="number"
              label={t('itineraryDayLabel')}
              value={day}
              onChange={(e) => setDay(e.target.value)}
              min={1}
              className="h-9 w-20"
            />
            <TimePicker label={t('itineraryTimeLabel')} value={time} onChange={setTime} />
            <Input
              label={t('itineraryLabelLabel')}
              placeholder={t('itineraryLabelPlaceholder')}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={160}
              className="h-9 min-w-[160px] flex-1"
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
            <label className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {t('itineraryIconLabel')}
            </label>
            <p className="-mt-1 text-xs text-neutral-500 dark:text-neutral-400">
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
                      'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-40',
                      selected
                        ? 'border-forest-600 bg-forest-50 text-forest-600 dark:bg-forest-600/20 dark:text-forest-400'
                        : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    )}
                  >
                    <ItineraryIcon iconKey={key} size={16} />
                  </button>
                );
              })}
            </div>
          </div>
          <Button size="sm" isLoading={adding} onClick={addBlock} className="self-start">
            <Plus size={14} weight="bold" />
            {t('itineraryAdd')}
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
