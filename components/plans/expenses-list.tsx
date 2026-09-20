'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Plus, Trash } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ExpenseData {
  id: string;
  paidBy: string;
  amountCrc: number;
  description: string;
  createdAt: string;
}

export interface PlanMember {
  id: string;
  displayName: string | null;
}

interface ExpensesListProps {
  tripId: string;
  currentUserId: string;
  isHostTeam: boolean;
  initialExpenses: ExpenseData[];
  members: PlanMember[];
}

export function ExpensesList({
  tripId,
  currentUserId,
  isHostTeam,
  initialExpenses,
  members,
}: ExpensesListProps) {
  const t = useTranslations('plans');
  const locale = useLocale();
  const [supabase] = useState(() => createClient());
  const [expenses, setExpenses] = useState(initialExpenses);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameById = new Map(members.map((m) => [m.id, m.displayName ?? '—']));
  const currency = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  const total = expenses.reduce((sum, e) => sum + e.amountCrc, 0);
  const memberCount = Math.max(members.length, 1);
  const share = Math.round(total / memberCount);

  const paidByMember = new Map<string, number>();
  for (const e of expenses) {
    paidByMember.set(e.paidBy, (paidByMember.get(e.paidBy) ?? 0) + e.amountCrc);
  }

  const addExpense = async () => {
    const amountNum = Math.round(Number(amount));
    if (!amountNum || amountNum <= 0 || !description.trim()) return;
    setAdding(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert({
        trip_id: tripId,
        paid_by: currentUserId,
        amount_crc: amountNum,
        description: description.trim(),
      })
      .select('id, paid_by, amount_crc, description, created_at')
      .single();

    setAdding(false);

    if (insertError || !data) {
      setError(t('expenseAddError'));
      return;
    }

    setExpenses((prev) => [
      {
        id: data.id,
        paidBy: data.paid_by,
        amountCrc: data.amount_crc,
        description: data.description,
        createdAt: data.created_at,
      },
      ...prev,
    ]);
    setAmount('');
    setDescription('');
  };

  const removeExpense = async (id: string, paidBy: string) => {
    if (paidBy !== currentUserId && !isHostTeam) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('expenses').delete().eq('id', id);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {t('expensesTitle')}
      </h2>
      <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400">{t('expensesHelper')}</p>

      {expenses.length > 0 && (
        <div className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-950">
          <p className="font-medium text-neutral-900 dark:text-neutral-100">
            {t('expensesTotal', { amount: currency.format(total) })}
          </p>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">
            {t('expensesShare', { amount: currency.format(share), count: memberCount })}
          </p>
        </div>
      )}

      {expenses.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500 dark:text-neutral-400">{t('expensesEmpty')}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {expenses.map((expense) => (
            <li
              key={expense.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-800"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                  {expense.description}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {t('expensePaidBy', { name: nameById.get(expense.paidBy) ?? '—' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {currency.format(expense.amountCrc)}
                </span>
                {(expense.paidBy === currentUserId || isHostTeam) && (
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => removeExpense(expense.id, expense.paidBy)}
                    aria-label={t('expenseRemove')}
                    className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    <Trash size={14} weight="regular" strokeWidth={1.5} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <Input
          type="number"
          label={t('expenseAmountLabel')}
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min={1}
          className="h-9 w-32"
        />
        <Input
          label={t('expenseDescriptionLabel')}
          placeholder={t('expenseDescriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-9 min-w-[160px] flex-1"
        />
        <Button size="sm" isLoading={adding} onClick={addExpense}>
          <Plus size={14} weight="bold" />
          {t('expenseAdd')}
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
