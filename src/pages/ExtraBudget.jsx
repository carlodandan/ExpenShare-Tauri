import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContextCore.jsx';
import { formatMoney, formatDate, monthLabel } from '../utils/format.js';
import UseExtraBudgetModal from '../components/UseExtraBudgetModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function ExtraBudget() {
  const { currencySymbol, dataVersion, notifyDataChanged, showToast } = useAppContext();
  const [history, setHistory] = useState(null);
  const [withdrawals, setWithdrawals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  async function load() {
    const [h, w, cats] = await Promise.all([
      window.tauriAPI.extraBudget.getHistory(),
      window.tauriAPI.extraBudget.listWithdrawals(),
      window.tauriAPI.expenses.listCategories(),
    ]);
    setHistory(h);
    setWithdrawals(w);
    // Filter only repeatable categories (Groceries, Miscellaneous, etc.)
    const repeatable = cats.filter((c) => c.type === 'repeatable');
    setCategories(repeatable);
  }

  useEffect(() => {
    load();
  }, [dataVersion]);

  async function handleWithdraw(payload) {
    // payload contains categoryId, amountMinor, description, month, date
    await window.tauriAPI.extraBudget.withdrawAndExpense(payload);
    setShowModal(false);
    notifyDataChanged();
    showToast('Expense and Extra Budget withdrawal recorded.');
  }

  async function handleDeleteWithdrawal() {
    if (!confirmTarget) return;
    await window.tauriAPI.extraBudget.deleteWithdrawal(confirmTarget.id);
    setConfirmTarget(null);
    notifyDataChanged();
    showToast('Withdrawal removed.');
  }

  if (!history) {
    return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  }

  const contributions = history.monthly.filter((m) => m.netMinor !== 0 || m.adjustmentsMinor !== 0);

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-lg font-semibold">Extra Budget</h1>
      <p className="text-xs text-ink-muted mt-0.5">
         Remaining budget carried over from the current or previous month after all expenses, savings, and other allocations have been accounted for.
      </p>

      <div className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-6 text-center sm:mt-6 sm:px-6 sm:py-8">
        <p className="font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          Available Balance
        </p>
        <p className="tabular mt-2 text-3xl font-semibold text-denim sm:text-4xl">
          {formatMoney(history.balanceMinor, currencySymbol)}
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={history.balanceMinor <= 0}
          className="mt-4 rounded-md bg-denim px-4 py-2 text-sm font-medium text-white hover:opacity-90 active:opacity-75 disabled:cursor-not-allowed disabled:opacity-40 sm:mt-5"
        >
          Use Extra Budget
        </button>
      </div>

      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-2 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          Monthly Contributions
        </h2>
        {contributions.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">No monthly history yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {contributions.map((m) => (
              <li key={m.month} className="flex items-center justify-between py-2 text-sm">
                <span>{monthLabel(m.month)}</span>
                <span
                  className={`tabular font-medium ${m.netMinor < 0 ? 'text-rust' : 'text-moss'}`}
                >
                  {m.netMinor >= 0 ? '+' : ''}
                  {formatMoney(m.netMinor, currencySymbol)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="ledger-total-rule mt-2 flex items-center justify-between pt-2 text-sm font-semibold">
          <span>Total</span>
          <span className="tabular">{formatMoney(history.balanceMinor, currencySymbol)}</span>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-6 sm:px-5 sm:py-4">
        <h2 className="mb-2 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          Withdrawals
        </h2>
        {withdrawals.length === 0 ? (
          <p className="py-3 text-sm text-ink-muted">No withdrawals recorded.</p>
        ) : (
          <ul className="divide-y divide-line">
            {withdrawals.map((w) => (
              <li key={w.id} className="group flex items-center justify-between py-2 text-sm">
                <div>
                  <p>{w.description || 'Withdrawal'}</p>
                  <p className="text-xs text-ink-muted">
                    {formatDate(w.date)} · Applied to {monthLabel(w.month)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular text-rust">-{formatMoney(w.amountMinor, currencySymbol)}</span>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(w)}
                    className="px-1 py-0.5 text-xs text-rust opacity-100 transition-opacity hover:underline active:opacity-70 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {showModal && (
        <UseExtraBudgetModal
          availableMinor={history.balanceMinor}
          categories={categories}
          onCancel={() => setShowModal(false)}
          onSubmit={handleWithdraw}
        />
      )}

      {confirmTarget && (
        <ConfirmDialog
          title="Delete this withdrawal?"
          description={`${confirmTarget.description || 'Withdrawal'} — ${formatMoney(
            confirmTarget.amountMinor,
            currencySymbol
          )}. This restores the amount to the available balance.`}
          onCancel={() => setConfirmTarget(null)}
          onConfirm={handleDeleteWithdrawal}
        />
      )}
    </div>
  );
}