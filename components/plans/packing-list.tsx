'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface PackingItemData {
  id: string;
  name: string;
  done: boolean;
  assignedTo: string | null;
}

export interface PlanMember {
  id: string;
  displayName: string | null;
}

interface PackingListProps {
  tripId: string;
  currentUserId: string;
  isHostTeam: boolean;
  initialItems: PackingItemData[];
  members: PlanMember[];
}

export function PackingList({ tripId, currentUserId, isHostTeam, initialItems, members }: PackingListProps) {
  const t = useTranslations('plans');
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState(initialItems);
  const [name, setName] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberOptions = [
    { value: '', label: t('packingUnassigned') },
    ...members.map((m) => ({ value: m.id, label: m.displayName ?? '—' })),
  ];
  const nameById = new Map(members.map((m) => [m.id, m.displayName ?? '—']));

  const toggleDone = async (item: PackingItemData) => {
    const nextDone = !item.done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: nextDone } : i)));
    const { error: updateError } = await supabase
      .from('packing_items')
      .update({ done: nextDone, done_by: nextDone ? currentUserId : null })
      .eq('id', item.id);
    if (updateError) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i)));
    }
  };

  const addItem = async () => {
    if (!name.trim()) return;
    setAdding(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('packing_items')
      .insert({
        trip_id: tripId,
        name: name.trim(),
        assigned_to: assignedTo || null,
        created_by: currentUserId,
      })
      .select('id, name, done, assigned_to')
      .single();

    setAdding(false);

    if (insertError || !data) {
      setError(t('packingAddError'));
      return;
    }

    setItems((prev) => [
      ...prev,
      { id: data.id, name: data.name, done: data.done, assignedTo: data.assigned_to },
    ]);
    setName('');
    setAssignedTo('');
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    await supabase.from('packing_items').delete().eq('id', id);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('packingTitle')}
      </h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('packingHelper')}</p>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('packingEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2 dark:border-neutral-800"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => toggleDone(item)}
                className="h-4 w-4 shrink-0 rounded border-neutral-300 text-forest-600 focus:ring-forest-600"
              />
              <span
                className={cn(
                  'flex-1 text-sm text-neutral-800 dark:text-neutral-200',
                  item.done && 'text-neutral-400 line-through dark:text-neutral-600'
                )}
              >
                {item.name}
              </span>
              {item.assignedTo && (
                <span className="shrink-0 text-xs text-neutral-500 dark:text-neutral-400">
                  {nameById.get(item.assignedTo) ?? '—'}
                </span>
              )}
              {isHostTeam && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => removeItem(item.id)}
                  aria-label={t('packingRemove')}
                  className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <Trash size={14} weight="regular" strokeWidth={1.5} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Input
          label={t('packingAddLabel')}
          placeholder={t('packingAddPlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 min-w-[160px] flex-1"
        />
        <div className="w-full sm:w-44">
          <Select value={assignedTo} onValueChange={setAssignedTo} options={memberOptions} />
        </div>
        <Button size="sm" isLoading={adding} onClick={addItem}>
          <Plus size={14} weight="bold" />
          {t('packingAdd')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
