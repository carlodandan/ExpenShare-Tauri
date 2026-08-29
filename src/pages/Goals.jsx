import React, { useEffect, useState, useCallback } from 'react';
import { Target, Plus, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';
import { useAppContext } from '../contexts/AppContextCore.jsx';
import { formatMoney } from '../utils/format.js';
import ProgressCircle from '../components/ProgressCircle.jsx';
import GoalDetailModal from '../components/GoalDetailModal.jsx';
import GoalFormModal from '../components/GoalFormModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import SummaryCard from '../components/SummaryCard.jsx';

export default function Goals() {
  const { currencySymbol, dataVersion, notifyDataChanged, showToast } = useAppContext();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [formModal, setFormModal] = useState(null); // { mode: 'create' | 'edit', goal?: object }
  const [deleteConfirmGoal, setDeleteConfirmGoal] = useState(null);

  const loadGoals = useCallback(async () => {
    try {
      setLoading(true);
      const list = await window.tauriAPI.goals.list();
      setGoals(list);

      // If a goal is currently opened in detail modal, update its reference
      setSelectedGoal((prev) => (prev ? list.find((g) => g.id === prev.id) || null : null));
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals, dataVersion]);

  async function handleCreateOrUpdateGoal(payload) {
    if (formModal?.mode === 'edit' && payload.id) {
      await window.tauriAPI.goals.update(payload.id, {
        name: payload.name,
        targetAmountMinor: payload.targetAmountMinor,
      });
      showToast('Goal updated.');
    } else {
      await window.tauriAPI.goals.create({
        name: payload.name,
        targetAmountMinor: payload.targetAmountMinor,
      });
      showToast('Goal created.');
    }
    notifyDataChanged();
    await loadGoals();
  }

  async function handleDeleteGoal() {
    if (!deleteConfirmGoal) return;
    try {
      await window.tauriAPI.goals.delete(deleteConfirmGoal.id);
      showToast(`Goal "${deleteConfirmGoal.name}" deleted.`);
      setDeleteConfirmGoal(null);
      if (selectedGoal?.id === deleteConfirmGoal.id) {
        setSelectedGoal(null);
      }
      notifyDataChanged();
      await loadGoals();
    } catch (err) {
      showToast(err?.message || 'Failed to delete goal.');
    }
  }

  // Calculate totals
  const totalTargetMinor = goals.reduce((sum, g) => sum + g.targetAmountMinor, 0);
  const totalSavedMinor = goals.reduce((sum, g) => sum + g.currentAmountMinor, 0);
  const overallProgress =
    totalTargetMinor > 0 ? Math.min(100, (totalSavedMinor / totalTargetMinor) * 100) : 0;
  const completedGoalsCount = goals.filter((g) => g.remainingAmountMinor <= 0).length;

  if (loading && goals.length === 0) {
    return <div className="p-8 text-sm text-ink-muted">Loading goals…</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Target className="text-moss" size={22} />
            Set Goals
          </h1>
          <p className="text-xs text-ink-muted mt-0.5">
            Plan your financial milestones and track contributions through Miscellaneous expenses.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setFormModal({ mode: 'create' })}
          className="flex items-center justify-center gap-1.5 rounded-md bg-moss px-3.5 py-2 text-sm font-medium text-white shadow-xs transition-opacity hover:opacity-90 active:opacity-75"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Goal</span>
        </button>
      </div>

      {/* Summary Cards */}
      {goals.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4">
          <SummaryCard label="Total Goals" minor={goals.length} tone="neutral" sublabel={`${completedGoalsCount} completed`} />
          <SummaryCard label="Total Target" minor={totalTargetMinor} tone="neutral" />
          <SummaryCard label="Total Saved" minor={totalSavedMinor} tone="positive" />
          <div className="rounded-lg border border-line bg-paper/80 px-3.5 py-3 sm:px-5 sm:py-4 flex items-center justify-between">
            <div>
              <p className="font-bodoni text-[10px] uppercase tracking-[0.14em] text-ink-muted sm:text-[11px]">
                Overall Progress
              </p>
              <p className="tabular mt-1 text-xl font-semibold sm:text-2xl text-moss">
                {overallProgress.toFixed(overallProgress % 1 === 0 ? 0 : 1)}%
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">Across all targets</p>
            </div>
            <ProgressCircle
              percent={overallProgress}
              size={52}
              strokeWidth={5}
              color="var(--color-moss)"
            >
              <Sparkles size={16} className="text-moss" />
            </ProgressCircle>
          </div>
        </div>
      )}

      {/* Goals Grid or Empty State */}
      {goals.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-line bg-paper/80/60 p-8 text-center sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-moss-soft text-moss">
            <Target size={28} strokeWidth={2} />
          </div>
          <h3 className="mt-4 text-base font-semibold">No Goals Set Yet</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-xs text-ink-muted sm:text-sm">
            Create goals like "House and Lot", "Car", or "Emergency Fund". Adding funds will record an expense in Miscellaneous for that month.
          </p>
          <button
            type="button"
            onClick={() => setFormModal({ mode: 'create' })}
            className="mt-5 inline-flex items-center gap-1.5 rounded-md bg-moss px-4 py-2 text-sm font-medium text-white shadow-xs hover:opacity-90"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Create Your First Goal</span>
          </button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const isCompleted = goal.remainingAmountMinor <= 0;
            return (
              <div
                key={goal.id}
                onClick={() => setSelectedGoal(goal)}
                className="group relative cursor-pointer flex flex-col justify-between rounded-xl border border-line bg-paper/80 p-4 transition-all hover:border-moss/40 hover:shadow-md"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold text-sm sm:text-base group-hover:text-moss transition-colors">
                        {goal.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-ink-muted font-bodoni">
                        Target: <span className="tabular font-medium text-ink">{formatMoney(goal.targetAmountMinor, currencySymbol)}</span>
                      </p>
                    </div>

                    {isCompleted ? (
                      <span className="flex items-center gap-1 rounded-full bg-moss-soft px-2 py-0.5 text-[11px] font-medium text-moss">
                        <CheckCircle2 size={12} /> Done
                      </span>
                    ) : (
                      <span className="tabular rounded-md bg-paper px-2 py-0.5 text-xs font-semibold text-ink-muted">
                        {goal.progressPercent.toFixed(goal.progressPercent % 1 === 0 ? 0 : 1)}%
                      </span>
                    )}
                  </div>

                  {/* Visual Progress & Figures */}
                  <div className="mt-4 flex items-center gap-4">
                    <ProgressCircle
                      percent={goal.progressPercent}
                      size={76}
                      strokeWidth={7}
                      color={isCompleted ? 'var(--color-moss)' : 'var(--color-denim)'}
                    >
                      <span className="tabular text-xs font-bold">
                        {goal.progressPercent.toFixed(0)}%
                      </span>
                    </ProgressCircle>

                    <div className="flex-1 space-y-1 text-xs">
                      <div>
                        <p className="text-[10px] uppercase font-bodoni tracking-wider text-ink-muted">Saved</p>
                        <p className="tabular font-bold text-sm text-moss">
                          {formatMoney(goal.currentAmountMinor, currencySymbol)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bodoni tracking-wider text-ink-muted">Remaining</p>
                        <p className={`tabular font-medium ${isCompleted ? 'text-moss' : 'text-ink-muted'}`}>
                          {isCompleted ? 'Goal Achieved! 🎉' : formatMoney(goal.remainingAmountMinor, currencySymbol)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Link */}
                <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-2.5 text-xs font-medium text-denim">
                  <span>View Details & Add Funds</span>
                  <ChevronRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onGoalUpdated={() => {
            notifyDataChanged();
            loadGoals();
          }}
          onEditGoal={(g) => {
            setSelectedGoal(null);
            setFormModal({ mode: 'edit', goal: g });
          }}
          onDeleteGoal={(g) => {
            setDeleteConfirmGoal(g);
          }}
        />
      )}

      {/* Goal Form Modal (Create / Edit) */}
      {formModal && (
        <GoalFormModal
          mode={formModal.mode}
          initial={formModal.goal}
          onClose={() => setFormModal(null)}
          onSubmit={handleCreateOrUpdateGoal}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirmGoal && (
        <ConfirmDialog
          title="Delete Goal"
          message={`Are you sure you want to delete "${deleteConfirmGoal.name}"? Goal contribution records will be deleted, but past Miscellaneous expense entries in your monthly ledgers will remain.`}
          confirmLabel="Delete"
          onConfirm={handleDeleteGoal}
          onCancel={() => setDeleteConfirmGoal(null)}
        />
      )}
    </div>
  );
}
