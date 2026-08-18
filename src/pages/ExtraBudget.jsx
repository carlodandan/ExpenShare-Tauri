import React, { useEffect, useState } from 'react';
import { useAppContext } from '../hooks/AppContext.jsx';
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
    <div className="mx-auto max-w-5xl px-2 py-6">
      <h1 className="text-lg font-semibold">Extra Budget</h1>

      <div className="mt-6 rounded-lg border border-line bg-surface px-6 py-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
          Available Balance
        </p>
        <p className="tabular mt-2 text-4xl font-semibold text-denim">
          {formatMoney(history.balanceMinor, currencySymbol)}
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={history.balanceMinor <= 0}
          className="mt-5 rounded-md bg-denim px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Use Extra Budget
        </button>
      </div>

      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
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

      <section className="mt-6 rounded-lg border border-line bg-surface px-5 py-4">
        <h2 className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">
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
                    className="text-xs text-rust opacity-0 hover:underline group-hover:opacity-100"
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