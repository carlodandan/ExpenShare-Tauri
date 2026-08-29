import React, { useState } from 'react';
import { Target, X } from 'lucide-react';
import { toMinorUnits, toMajorUnits } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';

export default function GoalFormModal({ mode = 'create', initial, onClose, onSubmit }) {
  const { currencySymbol } = useAppContext();
  const [name, setName] = useState(initial?.name || '');
  const [targetAmount, setTargetAmount] = useState(
    initial?.targetAmountMinor ? String(toMajorUnits(initial.targetAmountMinor)) : ''
  );
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a goal name.');
      return;
    }

    const targetAmountMinor = toMinorUnits(targetAmount);
    if (!Number.isFinite(targetAmountMinor) || targetAmountMinor <= 0) {
      setError('Please enter a valid target amount greater than zero.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        id: initial?.id,
        name: trimmedName,
        targetAmountMinor,
      });
      onClose();
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-line bg-paper/80 p-5 shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-line pb-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-moss-soft text-moss">
              <Target size={18} strokeWidth={2} />
            </div>
            <h2 className="text-base font-semibold">
              {mode === 'edit' ? 'Edit Goal' : 'Create New Goal'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-paper hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-ink-muted" htmlFor="goal-name">
              Goal Name
            </label>
            <input
              id="goal-name"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. House and Lot, Emergency Fund"
              className="mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted" htmlFor="goal-target">
              Target Amount ({currencySymbol})
            </label>
            <input
              id="goal-target"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              required
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="0.00"
              className="tabular mt-1 w-full rounded-md border border-line bg-paper px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
            />
          </div>

          {error && <p className="text-xs text-rust font-medium">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium hover:bg-paper"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-moss px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-75 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
}
