import React, { useState } from 'react';
import { formatMoney, formatDate, toMinorUnits } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';

export default function ExpenseSection({ categories, onSetFixed, onEditTransaction, onDeleteTransaction, onAddForCategory }) {
  const { currencySymbol } = useAppContext();
  const total = categories.reduce((sum, c) => sum + c.totalMinor, 0);

  return (
    <div>
      <div className="divide-y divide-line">
        {categories.map((category) =>
          category.type === 'fixed' ? (
            <FixedRow key={category.id} category={category} onSetFixed={onSetFixed} />
          ) : (
            <RepeatableRow
              key={category.id}
              category={category}
              onEdit={onEditTransaction}
              onDelete={onDeleteTransaction}
              onAdd={() => onAddForCategory(category)}
            />
          )
        )}
      </div>
      <div className="ledger-total-rule mt-2 flex items-center justify-between pt-2">
        <p className="text-sm font-semibold uppercase tracking-wide">Total</p>
        <p className="tabular text-sm font-semibold">{formatMoney(total, currencySymbol)}</p>
      </div>
    </div>
  );
}

function FixedRow({ category, onSetFixed }) {
  const { currencySymbol } = useAppContext();
  const [value, setValue] = useState(String((category.totalMinor || 0) / 100 || ''));
  const [saving, setSaving] = useState(false);

  async function commit() {
    const amountMinor = toMinorUnits(value || '0');
    if (!Number.isFinite(amountMinor) || amountMinor === category.totalMinor) return;
    setSaving(true);
    try {
      await onSetFixed(category, amountMinor);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center justify-between py-2">
      <label htmlFor={`fixed-${category.id}`} className="text-sm">
        {category.name}
      </label>
      <div className="flex items-center gap-1">
        <span className="text-sm text-ink-muted">{currencySymbol}</span>
        <input
          id={`fixed-${category.id}`}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          disabled={saving}
          className="tabular w-28 rounded-md border border-line bg-paper px-2 py-1 text-right text-sm"
        />
      </div>
    </div>
  );
}

function RepeatableRow({ category, onEdit, onDelete, onAdd }) {
  const { currencySymbol } = useAppContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 text-sm"
        >
          <span aria-hidden="true" className="text-xs text-ink-muted">
            {expanded ? '▾' : '▸'}
          </span>
          {category.name}
        </button>
        <div className="flex items-center gap-3">
          <span className="tabular text-sm">{formatMoney(category.totalMinor, currencySymbol)}</span>
          <button type="button" onClick={onAdd} className="text-xs text-moss hover:underline">
            + Add
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-1 pl-5">
          {category.transactions.length === 0 ? (
            <p className="py-2 text-xs text-ink-muted">No entries yet this month.</p>
          ) : (
            <ul className="divide-y divide-line">
              {category.transactions.map((tx) => (
                <li key={tx.id} className="group flex items-center justify-between py-1.5">
                  <div>
                    <p className="text-sm">{tx.description || category.name}</p>
                    <p className="text-xs text-ink-muted">{formatDate(tx.date)}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="tabular text-sm">{formatMoney(tx.amountMinor, currencySymbol)}</span>
                    <div className="flex gap-1.5 opacity-100 transition-opacity sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(tx, category)}
                        className="px-1 py-0.5 text-xs text-denim hover:underline active:opacity-70"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(tx)}
                        className="px-1 py-0.5 text-xs text-rust hover:underline active:opacity-70"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
