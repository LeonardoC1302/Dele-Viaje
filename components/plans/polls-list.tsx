'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash, X } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PollOption {
  key: string;
  label: string;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  closesAt: string | null;
  votesByOption: Record<string, number>;
  myVote: string | null;
}

interface PollsListProps {
  tripId: string;
  currentUserId: string;
  isHostTeam: boolean;
  initialPolls: PollData[];
}

export function PollsList({ tripId, currentUserId, isHostTeam, initialPolls }: PollsListProps) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [polls, setPolls] = useState(initialPolls);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });

  const vote = async (pollId: string, optionKey: string) => {
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) return;
    const previousVote = poll.myVote;

    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        const votesByOption = { ...p.votesByOption };
        if (previousVote) votesByOption[previousVote] = Math.max(0, (votesByOption[previousVote] ?? 1) - 1);
        votesByOption[optionKey] = (votesByOption[optionKey] ?? 0) + 1;
        return { ...p, votesByOption, myVote: optionKey };
      })
    );

    await supabase
      .from('poll_votes')
      .upsert(
        { poll_id: pollId, profile_id: currentUserId, option_key: optionKey },
        { onConflict: 'poll_id,profile_id' }
      );
  };

  const addOptionField = () => setOptions((prev) => [...prev, '']);
  const removeOptionField = (index: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== index));

  const createPoll = async () => {
    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      setError(t('pollCreateValidation'));
      return;
    }
    setCreating(true);
    setError(null);

    const optionObjs: PollOption[] = cleanOptions.map((label, i) => ({ key: String(i), label }));

    const { data, error: insertError } = await supabase
      .from('polls')
      .insert({
        trip_id: tripId,
        question: question.trim(),
        options: optionObjs,
        created_by: currentUserId,
      })
      .select('id, question, options, created_by, closes_at')
      .single();

    setCreating(false);

    if (insertError || !data) {
      setError(t('pollCreateError'));
      return;
    }

    setPolls((prev) => [
      {
        id: data.id,
        question: data.question,
        options: data.options as PollOption[],
        createdBy: data.created_by,
        closesAt: data.closes_at,
        votesByOption: {},
        myVote: null,
      },
      ...prev,
    ]);
    setQuestion('');
    setOptions(['', '']);
  };

  const closePoll = async (pollId: string) => {
    setPolls((prev) => prev.map((p) => (p.id === pollId ? { ...p, closesAt: new Date().toISOString() } : p)));
    await supabase.from('polls').update({ closes_at: new Date().toISOString() }).eq('id', pollId);
  };

  const deletePoll = async (pollId: string) => {
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    await supabase.from('polls').update({ deleted_at: new Date().toISOString() }).eq('id', pollId);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{t('pollsTitle')}</h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('pollsHelper')}</p>

      {polls.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('pollsEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {polls.map((poll) => {
            const isClosed = poll.closesAt != null && new Date(poll.closesAt) <= new Date();
            const totalVotes = Object.values(poll.votesByOption).reduce((a, b) => a + b, 0);
            const canManage = poll.createdBy === currentUserId || isHostTeam;

            return (
              <li key={poll.id} className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {poll.question}
                  </p>
                  {canManage && (
                    <div className="flex shrink-0 gap-1">
                      {!isClosed && (
                        <Button size="xs" variant="ghost" onClick={() => closePoll(poll.id)}>
                          {t('pollClose')}
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => deletePoll(poll.id)}
                        aria-label={t('pollDelete')}
                        className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                      >
                        <Trash size={14} weight="regular" strokeWidth={1.5} />
                      </Button>
                    </div>
                  )}
                </div>

                {isClosed && (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {t('pollClosedOn', { date: dateFormatter.format(new Date(poll.closesAt!)) })}
                  </p>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {poll.options.map((option) => {
                    const count = poll.votesByOption[option.key] ?? 0;
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                    const isMine = poll.myVote === option.key;

                    return (
                      <button
                        key={option.key}
                        type="button"
                        disabled={isClosed}
                        onClick={() => vote(poll.id, option.key)}
                        className={cn(
                          'relative overflow-hidden rounded-lg border p-2 text-left text-sm transition-colors disabled:cursor-not-allowed',
                          isMine
                            ? 'border-forest-500 bg-forest-50 dark:bg-forest-950'
                            : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                        )}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-forest-100 dark:bg-forest-900/40"
                          style={{ width: `${pct}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="text-neutral-800 dark:text-neutral-200">{option.label}</span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {t('pollVoteCount', { count })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4 dark:border-neutral-800">
        <Input
          label={t('pollQuestionLabel')}
          placeholder={t('pollQuestionPlaceholder')}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="h-9"
        />
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder={t('pollOptionPlaceholder', { index: i + 1 })}
              value={opt}
              onChange={(e) =>
                setOptions((prev) => prev.map((o, idx) => (idx === i ? e.target.value : o)))
              }
              className="h-9 flex-1"
            />
            {options.length > 2 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => removeOptionField(i)}
                aria-label={t('pollRemoveOption')}
              >
                <X size={14} weight="bold" />
              </Button>
            )}
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs" variant="secondary" onClick={addOptionField}>
            <Plus size={14} weight="bold" />
            {t('pollAddOption')}
          </Button>
          <Button size="sm" isLoading={creating} onClick={createPoll}>
            {t('pollCreate')}
          </Button>
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
