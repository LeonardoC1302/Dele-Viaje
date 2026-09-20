'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Trash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface TourQuestionData {
  id: string;
  askedBy: string;
  askedByName: string | null;
  question: string;
  answer: string | null;
  answeredAt: string | null;
  createdAt: string;
}

interface TourQAProps {
  tripId: string;
  currentUserId?: string;
  isHostTeam: boolean;
  initialQuestions: TourQuestionData[];
}

export function TourQA({ tripId, currentUserId, isHostTeam, initialQuestions }: TourQAProps) {
  const t = useTranslations('agencies');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [questions, setQuestions] = useState(initialQuestions);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [answeringId, setAnsweringId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  const askQuestion = async () => {
    if (!question.trim() || !currentUserId) return;
    setAsking(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('tour_questions')
      .insert({ trip_id: tripId, asked_by: currentUserId, question: question.trim() })
      .select('id, asked_by, question, answer, answered_at, created_at')
      .single();

    setAsking(false);

    if (insertError || !data) {
      setError(t('qaAskError'));
      return;
    }

    setQuestions((prev) => [
      ...prev,
      {
        id: data.id,
        askedBy: data.asked_by,
        askedByName: t('qaYou'),
        question: data.question,
        answer: data.answer,
        answeredAt: data.answered_at,
        createdAt: data.created_at,
      },
    ]);
    setQuestion('');
  };

  const submitAnswer = async (id: string) => {
    const answer = drafts[id]?.trim();
    if (!answer) return;
    setAnsweringId(id);
    setError(null);

    const { error: updateError } = await supabase
      .from('tour_questions')
      .update({ answer, answered_at: new Date().toISOString() })
      .eq('id', id);

    setAnsweringId(null);

    if (updateError) {
      setError(t('qaAnswerError'));
      return;
    }

    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, answer, answeredAt: new Date().toISOString() } : q))
    );
  };

  const removeQuestion = async (id: string) => {
    setRemovingId(id);
    setError(null);
    const { error: deleteError } = await supabase.from('tour_questions').delete().eq('id', id);
    setRemovingId(null);
    if (deleteError) {
      setError(t('qaRemoveError'));
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('qaTitle')}</h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('qaHelper')}</p>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('qaEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {questions.map((q) => (
            <li key={q.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{q.question}</p>
                {isHostTeam && (
                  <Button
                    size="xs"
                    variant="ghost"
                    isLoading={removingId === q.id}
                    onClick={() => removeQuestion(q.id)}
                    aria-label={t('qaRemove')}
                    className="shrink-0 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
              <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                {q.askedByName ?? '—'} · {dateFormatter.format(new Date(q.createdAt))}
              </p>

              {q.answer ? (
                <div className="mt-2 rounded-lg bg-forest-50 p-3 text-sm dark:bg-forest-600/10">
                  <p className="text-xs font-medium text-forest-700 dark:text-forest-400">{t('qaAnsweredByAgency')}</p>
                  <p className="mt-1 text-neutral-800 dark:text-neutral-200">{q.answer}</p>
                </div>
              ) : isHostTeam ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Textarea
                    placeholder={t('qaAnswerPlaceholder')}
                    value={drafts[q.id] ?? ''}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="min-h-16"
                    maxLength={1000}
                  />
                  <Button
                    size="xs"
                    variant="secondary"
                    className="self-start"
                    isLoading={answeringId === q.id}
                    onClick={() => submitAnswer(q.id)}
                  >
                    {t('qaAnswer')}
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-400 dark:text-neutral-600">{t('qaPending')}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {currentUserId && !isHostTeam && (
        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
          <Textarea
            placeholder={t('qaAskPlaceholder')}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="min-h-16"
            maxLength={500}
          />
          <Button size="sm" isLoading={asking} onClick={askQuestion} className="self-start">
            {t('qaAsk')}
          </Button>
        </div>
      )}
    </div>
  );
}
