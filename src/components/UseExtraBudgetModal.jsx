import React, { useState } from 'react';
import { toMinorUnits, currentMonthKey, formatMoney } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';

export default function UseExtraBudgetModal({ availableMinor, categories, onCancel, onSubmit }) {
  const { currencySymbol } = useAppContext();
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [month, setMonth] = useState(currentMonthKey());
  const [categoryId, setCategoryId] = useState(categories.length > 0 ? categories[0].id : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const amountMinor = toMinorUnits(amount);

    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (amountMinor > availableMinor) {
      setError('Amount cannot exceed the available Extra Budget.');
      return;
    }
    if (!month) {
      setError('Please choose a month to apply this to.');
      return;
    }
    if (!categoryId) {
      setError('Please select a category.');
      return;
    }

    setSubmitting(true);
    try {
      // We'll send the selected category, amount, reason, month and a date (first of month)
      const date = `${month}-01`;
      await onSubmit({
        categoryId,
        amountMinor,
        description: reason,
        month,
        date,
      });
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
        <h2 className="text-sm font-semibold">Use Extra Budget</h2>
        <p className="mt-1 text-xs text-ink-muted">
          Available: <span className="tabular">{formatMoney(availableMinor, currencySymbol)}</span>
        </p>

        <label className="mt-4 block text-xs font-medium text-ink-muted" htmlFor="wd-category">
          Category
        </label>
        <select
          id="wd-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="wd-amount">
          Amount
        </label>
        <input
          id="wd-amount"
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="tabular mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="wd-reason">
          Reason
        </label>
        <input
          id="wd-reason"
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Emergency expense"
          className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm"
        />

        <label className="mt-3 block text-xs font-medium text-ink-muted" htmlFor="wd-month">
          Apply to month
        </label>
        <input
          id="wd-month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
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
            className="flex-1 sm:flex-none rounded-md bg-denim px-3.5 py-2 sm:py-1.5 text-sm font-medium text-white hover:opacity-90 active:opacity-75 disabled:opacity-60"
          >
            Confirm
          </button>
        </div>
      </form>
    </div>
  );
}