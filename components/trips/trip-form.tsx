'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { DateTimeField } from '@/components/ui/date-time-field';
import { Button } from '@/components/ui/button';
import { CATEGORY_KEYS } from '@/lib/constants/categories';

type Status = 'idle' | 'loading' | 'error';

export function TripForm() {
  const t = useTranslations('trips');
  const tCategories = useTranslations('categories');
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>(CATEGORY_KEYS[0]);
  const [locationName, setLocationName] = useState('');
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [capacity, setCapacity] = useState('');
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

    const res = await fetch('/api/trips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description,
        category,
        locationName,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        capacity: capacity ? Number(capacity) : null,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error?.message ?? t('genericError'));
      setStatus('error');
      return;
    }

    const { id } = await res.json();
    router.push(`/trips/${id}`);
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-[560px] rounded-xl border border-neutral-200 bg-white p-8 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
        {t('newTitle')}
      </h1>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        {t('newSubtitle')}
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Input
          label={t('titleLabel')}
          placeholder={t('titlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          minLength={3}
          maxLength={120}
        />

        <Textarea
          label={t('descriptionLabel')}
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={2000}
        />

        <Select
          label={t('categoryLabel')}
          value={category}
          onValueChange={setCategory}
          options={categoryOptions}
          required
        />

        <Input
          label={t('locationLabel')}
          placeholder={t('locationPlaceholder')}
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          required
          minLength={2}
          maxLength={160}
        />

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

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <Button type="submit" size="lg" isLoading={status === 'loading'}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}
