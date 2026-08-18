import React, { useCallback, useEffect, useState } from 'react';
import { currentMonthKey } from '../utils/format.js';
import { useAppContext } from '../hooks/AppContext.jsx';
import MonthSelector from '../components/MonthSelector.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import IncomeSection from '../components/IncomeSection.jsx';
import ExpenseSection from '../components/ExpenseSection.jsx';
import AddTransactionButton from '../components/AddTransactionButton.jsx';
import TransactionModal from '../components/TransactionModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import ExportMenu from '../components/ExportMenu.jsx';
import { formatMoney } from '../utils/format.js';

export default function MonthlyDashboard() {
  const { people, currencySymbol, dataVersion, notifyDataChanged, showToast } = useAppContext();
  const [month, setMonth] = useState(currentMonthKey());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const monthly = await window.tauriAPI.dashboard.getMonthly(month);
      setData(monthly);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load, dataVersion]);

  function openAddIncome() {
    setModal({ kind: 'income', mode: 'create', options: people });
  }

  function openAddExpense(category) {
    const repeatableCategories = data.expenseCategories.filter((c) => c.type === 'repeatable');
    setModal({
      kind: 'expense',
      mode: 'create',
      options: repeatableCategories,
      initial: category ? { optionId: category.id } : undefined,
    });
  }

  function openEditIncome(tx) {
    setModal({
      kind: 'income',
      mode: 'edit',
      options: people,
      initial: { id: tx.id, optionId: tx.personId, amountMinor: tx.amountMinor, description: tx.description, date: tx.date },
    });
  }

  function openEditExpense(tx, category) {
    const repeatableCategories = data.expenseCategories.filter((c) => c.type === 'repeatable');
    setModal({
      kind: 'expense',
      mode: 'edit',
      options: repeatableCategories,
      initial: {
        id: tx.id,
        optionId: category.id,
        amountMinor: tx.amountMinor,
        description: tx.description,
        date: tx.date,
      },
    });
  }

  async function handleModalSubmit({ optionId, amountMinor, description, date }) {
    if (modal.kind === 'income') {
      const payload = { personId: optionId, amountMinor, description, date };
      if (modal.mode === 'edit') {
        await window.tauriAPI.income.update(modal.initial.id, payload);
        showToast('Income updated.');
      } else {
        await window.tauriAPI.income.create(payload);
        showToast('Income added.');
      }
    } else {
      const payload = { categoryId: optionId, amountMinor, description, date };
      if (modal.mode === 'edit') {
        await window.tauriAPI.expenses.update(modal.initial.id, payload);
        showToast('Expense updated.');
      } else {
        await window.tauriAPI.expenses.create(payload);
        showToast('Expense added.');
      }
    }
    setModal(null);
    notifyDataChanged();
  }

  async function handleSetFixed(category, amountMinor) {
    await window.tauriAPI.expenses.setFixedForMonth({ categoryId: category.id, amountMinor, month });
    notifyDataChanged();
    showToast(`${category.name} updated.`);
  }

  async function handleConfirmDelete() {
    const { type, tx } = confirmTarget;
    if (type === 'income') {
      await window.tauriAPI.income.delete(tx.id);
    } else {
      await window.tauriAPI.expenses.delete(tx.id);
    }
    setConfirmTarget(null);
    notifyDataChanged();
    showToast('Transaction deleted.');
  }

  if (loading || !data) {
    return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  }

  const netTone = data.netMinor < 0 ? 'negative' : 'positive';

  return (
    <div className="mx-auto max-w-5xl px-2 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Monthly Dashboard</h1>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={setMonth} />
          <ExportMenu month={month} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-5 grid grid-cols-2 gap-4">
        <SummaryCard label="Gross" minor={data.grossMinor} tone="neutral" />
        <SummaryCard label="Net" minor={data.netMinor} tone={netTone} />
      </div>

      {/* Extra Budget alerts */}
      {data.extraBudget.shortfallMinor > 0 && (
        <div className="mt-4 rounded-md border border-rust bg-rust-soft px-4 py-3 text-sm text-rust">
          Extra Budget could not cover this month's shortfall of{' '}
          <span className="tabular font-semibold">
            {formatMoney(data.extraBudget.shortfallMinor, currencySymbol)}
          </span>
          . Extra Budget is at ₱0.
        </div>
      )}
      {data.extraBudget.usedMinor > 0 && (
        <div className="mt-4 rounded-md border border-denim bg-denim-soft px-4 py-3 text-sm text-denim">
          Extra Budget used this month:{' '}
          <span className="tabular font-semibold">
            {formatMoney(data.extraBudget.usedMinor, currencySymbol)}
          </span>
        </div>
      )}

      {/* Two‑column grid: Expenses (col-span-2) | Income (col-span-3) */}
      <div className="mt-4 grid grid-cols-5 gap-6">
        <section className="col-span-2 rounded-lg border border-line bg-surface px-5 py-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Expenses
          </h2>
          <ExpenseSection
            categories={data.expenseCategories}
            onSetFixed={handleSetFixed}
            onEditTransaction={openEditExpense}
            onDeleteTransaction={(tx) => setConfirmTarget({ type: 'expense', tx })}
            onAddForCategory={openAddExpense}
          />
        </section>

        <section className="col-span-3 rounded-lg border border-line bg-surface px-5 py-4">
          <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            Income
          </h2>
          <IncomeSection
            income={data.income}
            onAdd={openAddIncome}
            onEdit={openEditIncome}
            onDelete={(tx) => setConfirmTarget({ type: 'income', tx })}
          />
        </section>
      </div>

      {/* Floating Add Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <AddTransactionButton onAddIncome={openAddIncome} onAddExpense={() => openAddExpense()} />
      </div>

      {/* Modals and confirm dialog */}
      {modal && (
        <TransactionModal
          kind={modal.kind}
          mode={modal.mode}
          initial={modal.initial}
          options={modal.options}
          onCancel={() => setModal(null)}
          onSubmit={handleModalSubmit}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Delete this transaction?"
          description={`${confirmTarget.tx.description || 'This entry'} — ${formatMoney(
            confirmTarget.tx.amountMinor,
            currencySymbol
          )}`}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}