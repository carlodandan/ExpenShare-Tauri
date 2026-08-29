import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Edit3, Target, Calendar, CheckCircle2 } from 'lucide-react';
import { formatMoney, toMinorUnits, formatDate } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';
import ProgressCircle from './ProgressCircle.jsx';

export default function GoalDetailModal({
  goal,
  onClose,
  onGoalUpdated,
  onEditGoal,
  onDeleteGoal,
}) {
  const { currencySymbol, showToast } = useAppContext();
  const [contributions, setContributions] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Add Funds form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadContributions() {
    try {
      setLoadingHistory(true);
      const list = await window.tauriAPI.goals.listContributions(goal.id);
      setContributions(list);
    } catch (err) {
      console.error('Failed to load contributions:', err);
    } finally {
      setLoadingHistory(false);
    }
  }

  useEffect(() => {
    loadContributions();
  }, [goal.id]);

  async function handleAddFunds(e) {
    e.preventDefault();
    setError('');

    const amountMinor = toMinorUnits(amount);
    if (!Number.isFinite(amountMinor) || amountMinor <= 0) {
      setError('Please enter a valid amount greater than zero.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }

    setSubmitting(true);
    try {
      await window.tauriAPI.goals.addFunds({
        goalId: goal.id,
        amountMinor,
        description: note.trim() || undefined,
        date,
      });

      setAmount('');
      setNote('');
      setShowAddForm(false);
      showToast(`Added ${formatMoney(amountMinor, currencySymbol)} to ${goal.name}.`);
      await loadContributions();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      setError(err?.message || 'Failed to add funds. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteContribution(contribId) {
    if (!window.confirm('Delete this contribution? The corresponding Miscellaneous expense will also be removed.')) {
      return;
    }

    try {
      await window.tauriAPI.goals.deleteContribution(contribId);
      showToast('Contribution removed.');
      await loadContributions();
      if (onGoalUpdated) onGoalUpdated();
    } catch (err) {
      showToast(err?.message || 'Failed to delete contribution.');
    }
  }

  const isCompleted = goal.remainingAmountMinor <= 0;
  const currentMonthName = new Date().toLocaleString('default', { month: 'long' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-line bg-paper/80 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-moss-soft text-moss">
              <Target size={20} strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-base font-semibold leading-tight">{goal.name}</h2>
              <p className="text-xs text-ink-muted">Savings Goal</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditGoal(goal)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper hover:text-ink"
              title="Edit Goal"
            >
              <Edit3 size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteGoal(goal)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-rust-soft hover:text-rust"
              title="Delete Goal"
            >
              <Trash2 size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-paper hover:text-ink"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Circular Progress & Metrics */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8 rounded-lg border border-line bg-paper/60 p-4">
            <ProgressCircle
              percent={goal.progressPercent}
              size={140}
              strokeWidth={12}
              color={isCompleted ? 'var(--color-moss)' : 'var(--color-denim)'}
            >
              <div className="flex flex-col items-center">
                <span className="tabular text-2xl font-bold tracking-tight">
                  {goal.progressPercent.toFixed(goal.progressPercent % 1 === 0 ? 0 : 1)}%
                </span>
                {isCompleted ? (
                  <span className="flex items-center gap-1 text-[11px] font-medium text-moss">
                    <CheckCircle2 size={12} /> Reached
                  </span>
                ) : (
                  <span className="text-[10px] uppercase tracking-wider text-ink-muted">Progress</span>
                )}
              </div>
            </ProgressCircle>

            <div className="w-full flex-1 space-y-2.5 text-sm">
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-xs text-ink-muted uppercase tracking-wider font-bodoni">Saved</span>
                <span className="tabular font-semibold text-moss">
                  {formatMoney(goal.currentAmountMinor, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-line pb-1.5">
                <span className="text-xs text-ink-muted uppercase tracking-wider font-bodoni">Target</span>
                <span className="tabular font-semibold">
                  {formatMoney(goal.targetAmountMinor, currencySymbol)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-0.5">
                <span className="text-xs text-ink-muted uppercase tracking-wider font-bodoni">Remaining</span>
                <span className={`tabular font-semibold ${isCompleted ? 'text-moss' : 'text-rust'}`}>
                  {isCompleted ? 'Goal Complete! 🎉' : formatMoney(goal.remainingAmountMinor, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Add Funds Button / Section */}
          <div>
            {!showAddForm ? (
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-moss px-4 py-2.5 text-sm font-medium text-white shadow-xs transition-opacity hover:opacity-90 active:opacity-75"
              >
                <Plus size={16} strokeWidth={2.5} />
                Add Funds to Goal
              </button>
            ) : (
              <form
                onSubmit={handleAddFunds}
                className="rounded-lg border border-moss/30 bg-moss-soft/40 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-moss font-bodoni">
                    Add Funds (Records in Miscellaneous)
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setError('');
                    }}
                    className="text-xs text-ink-muted hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted" htmlFor="goal-fund-amount">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    id="goal-fund-amount"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="tabular mt-1 w-full rounded-md border border-line bg-paper/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted" htmlFor="goal-fund-date">
                      Date
                    </label>
                    <input
                      id="goal-fund-date"
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="tabular mt-1 w-full rounded-md border border-line bg-paper/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted" htmlFor="goal-fund-note">
                      Note / Description (optional)
                    </label>
                    <input
                      id="goal-fund-note"
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Monthly allocation"
                      className="mt-1 w-full rounded-md border border-line bg-paper/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-ink-muted">
                  💡 This will create an expense under <span className="font-medium text-ink">Miscellaneous</span> for the selected date.
                </p>

                {error && <p className="text-xs text-rust font-medium">{error}</p>}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setError('');
                    }}
                    className="rounded-md border border-line bg-paper/80 px-3 py-1.5 text-xs hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-md bg-moss px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? 'Saving…' : 'Confirm Deposit'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Contribution History */}
          <div>
            <h3 className="mb-3 font-bodoni text-[11px] uppercase tracking-[0.14em] text-ink-muted">
              Contribution History
            </h3>

            {loadingHistory ? (
              <p className="py-4 text-center text-xs text-ink-muted">Loading history…</p>
            ) : contributions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink-muted">
                No contributions yet. Add your first funds above!
              </p>
            ) : (
              <div className="divide-y divide-line rounded-lg border border-line bg-paper/80 overflow-hidden">
                {contributions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between px-3.5 py-2.5 text-sm hover:bg-paper/40 transition-colors">
                    <div>
                      <p className="font-medium text-xs sm:text-sm">{c.description || 'Added funds'}</p>
                      <p className="tabular text-[11px] text-ink-muted flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> {c.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular font-semibold text-moss text-sm">
                        +{formatMoney(c.amountMinor, currencySymbol)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteContribution(c.id)}
                        className="rounded p-1 text-ink-muted hover:bg-rust-soft hover:text-rust transition-colors"
                        title="Delete contribution"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-paper/30 px-5 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-line bg-paper/80 px-4 py-1.5 text-sm font-medium hover:bg-paper"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
