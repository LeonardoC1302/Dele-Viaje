'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Star, Trash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface ReviewData {
  id: string;
  reviewerId: string;
  reviewerName: string | null;
  rating: number;
  body: string | null;
  responseText: string | null;
  respondedAt: string | null;
  createdAt: string;
}

interface TourReviewsProps {
  tripId: string;
  currentUserId?: string;
  isHostTeam: boolean;
  canReview: boolean;
  initialReviews: ReviewData[];
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          weight={n <= value ? 'fill' : 'regular'}
          strokeWidth={1.5}
          className={n <= value ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-700'}
        />
      ))}
    </span>
  );
}

export function TourReviews({ tripId, currentUserId, isHostTeam, canReview, initialReviews }: TourReviewsProps) {
  const t = useTranslations('agencies');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [reviews, setReviews] = useState(initialReviews);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const average = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;

  const submitReview = async () => {
    if (!currentUserId) return;
    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('reviews')
      .insert({ trip_id: tripId, reviewer_id: currentUserId, rating, body: body.trim() || null })
      .select('id, reviewer_id, rating, body, response_text, responded_at, created_at')
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError(t('reviewSubmitError'));
      return;
    }

    setReviews((prev) => [
      {
        id: data.id,
        reviewerId: data.reviewer_id,
        reviewerName: t('qaYou'),
        rating: data.rating,
        body: data.body,
        responseText: data.response_text,
        respondedAt: data.responded_at,
        createdAt: data.created_at,
      },
      ...prev,
    ]);
    setBody('');
    setPosted(true);
  };

  const submitResponse = async (id: string) => {
    const responseText = drafts[id]?.trim();
    if (!responseText) return;
    setRespondingId(id);
    setError(null);

    const { error: updateError } = await supabase
      .from('reviews')
      .update({ response_text: responseText, responded_at: new Date().toISOString() })
      .eq('id', id);

    setRespondingId(null);

    if (updateError) {
      setError(t('reviewResponseError'));
      return;
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, responseText, respondedAt: new Date().toISOString() } : r))
    );
  };

  const removeReview = async (id: string) => {
    setRemovingId(id);
    setError(null);
    const { error: deleteError } = await supabase.from('reviews').delete().eq('id', id);
    setRemovingId(null);
    if (deleteError) {
      setError(t('reviewRemoveError'));
      return;
    }
    setReviews((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('reviewsTitle')}</h2>
        {average != null && (
          <div className="flex items-center gap-1.5">
            <Stars value={Math.round(average)} />
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('reviewsAverage', { average: average.toFixed(1), count: reviews.length })}
            </span>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {reviews.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('reviewsEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Stars value={review.rating} />
                  <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {review.reviewerName ?? '—'} · {dateFormatter.format(new Date(review.createdAt))}
                  </p>
                </div>
                {review.reviewerId === currentUserId && (
                  <Button
                    size="xs"
                    variant="ghost"
                    isLoading={removingId === review.id}
                    onClick={() => removeReview(review.id)}
                    aria-label={t('reviewRemove')}
                    className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
              {review.body && <p className="mt-2 text-sm text-neutral-800 dark:text-neutral-200">{review.body}</p>}

              {review.responseText ? (
                <div className="mt-2 rounded-lg bg-forest-50 p-3 text-sm dark:bg-forest-600/10">
                  <p className="text-xs font-medium text-forest-700 dark:text-forest-400">{t('qaAnsweredByAgency')}</p>
                  <p className="mt-1 text-neutral-800 dark:text-neutral-200">{review.responseText}</p>
                </div>
              ) : (
                isHostTeam && (
                  <div className="mt-2 flex flex-col gap-2">
                    <Textarea
                      placeholder={t('reviewResponsePlaceholder')}
                      value={drafts[review.id] ?? ''}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [review.id]: e.target.value }))}
                      className="min-h-16"
                      maxLength={1000}
                    />
                    <Button
                      size="xs"
                      variant="secondary"
                      className="self-start"
                      isLoading={respondingId === review.id}
                      onClick={() => submitResponse(review.id)}
                    >
                      {t('reviewRespond')}
                    </Button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {canReview && !posted && (
        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{t('reviewYourRating')}</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={String(n)}>
                <Star
                  size={22}
                  weight={n <= rating ? 'fill' : 'regular'}
                  strokeWidth={1.5}
                  className={cn(n <= rating ? 'text-amber-500' : 'text-neutral-300 dark:text-neutral-700')}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder={t('reviewBodyPlaceholder')}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="min-h-16"
            maxLength={1000}
          />
          <Button size="sm" isLoading={submitting} onClick={submitReview} className="self-start">
            {t('reviewSubmit')}
          </Button>
        </div>
      )}
    </div>
  );
}
