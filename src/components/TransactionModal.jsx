import React, { useState } from 'react';
import { toMinorUnits, todayInputValue } from '../utils/format.js';

/**
 * kind: 'income' | 'expense'
 * mode: 'create' | 'edit'
 * For income: options = people [{id, name}]
 * For expense: options = repeatable categories [{id, name}] (fixed categories
 * are edited inline on the dashboard via FixedExpenseRow, not this modal).
 */
export default function TransactionModal({ kind, mode = 'create', initial, options, onCancel, onSubmit }) {
  const [optionId, setOptionId] = useState(initial?.optionId ?? options?.[0]?.id ?? '');
  const [amount, setAmount] = useState(
    initial ? String((initial.amountMinor ?? 0) / 100) : ''
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [date, setDate] = useState(initial?.date ?? todayInputValue());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isIncome = kind === 'income';
  const optionLabel = isIncome ? 'Person' : 'Category';
  const title = `${mode === 'edit' ? 'Edit' : 'Add'} ${isIncome ? 'Income' : 'Expense'}`;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const amountMinor = toMinorUnits(amount);
    if (!optionId) {
      setError(`${optionLabel} is required.`);
      return;
    }
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!date) {
      setError('Date is required.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ optionId, amountMinor, description, date });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 p-4">
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-lg border border-line bg-paper/80 p-5 shadow-lg"
      >
        <h2 className="text-sm font-semibold">{title}</h2>

        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="tx-option">
          {optionLabel}
        </label>
        <select
          id="tx-option"
          value={optionId}
          onChange={(e) => setOptionId(Number(e.target.value))}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        >
          {(options || []).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="tx-amount">
          Amount
        </label>
        <input
          id="tx-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="tabular mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="tx-description">
          Description
        </label>
        <input
          id="tx-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={isIncome ? 'e.g. Salary' : 'e.g. Weekly groceries'}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="tx-date">
          Date
        </label>
        <input
          id="tx-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="tabular mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}

        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 sm:flex-none rounded-md border border-line px-3.5 py-2 sm:py-1.5 text-sm hover:bg-paper active:opacity-70"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 sm:flex-none rounded-md bg-moss px-3.5 py-2 sm:py-1.5 text-sm font-medium text-white hover:opacity-90 active:opacity-75 disabled:opacity-60"
          >
            {mode === 'edit' ? 'Save Changes' : `Add ${isIncome ? 'Income' : 'Expense'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
