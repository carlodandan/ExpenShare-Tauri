import React, { useState } from 'react';
import { formatMoney, formatDate } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';
import EmptyState from './EmptyState.jsx';

export default function IncomeSection({ income, onAdd, onEdit, onDelete }) {
  const { currencySymbol, people } = useAppContext();
  const [expanded, setExpanded] = useState({});

  // Build a map: personId -> array of transactions
  const groups = {};
  income.forEach((tx) => {
    if (!groups[tx.personId]) {
      groups[tx.personId] = {
        name: tx.personName,
        items: [],
        total: 0,
      };
    }
    groups[tx.personId].items.push(tx);
    groups[tx.personId].total += tx.amountMinor;
  });

  // Sort people by sort_order
  const sortedPeople = people.slice().sort((a, b) => a.sort_order - b.sort_order);

  // Toggle expansion for a transaction
  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // If no income at all, show a single empty state
  if (income.length === 0) {
    return (
      <EmptyState
        message="No income recorded for this month."
        actionLabel="Add Income"
        onAction={onAdd}
      />
    );
  }

  const isSingle = sortedPeople.length === 1;

  return (
    <div>
      <div className={`grid grid-cols-1 gap-5 ${sortedPeople.length === 2 ? 'sm:grid-cols-2 sm:gap-6' : sortedPeople.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3 sm:gap-6' : ''}`}>
        {sortedPeople.map((person, index) => {
          const group = groups[person.id];
          const items = group ? group.items : [];
          const total = group ? group.total : 0;

          const borderClass =
            !isSingle && sortedPeople.length === 2 && index === 0
              ? 'border-b border-line pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6'
              : !isSingle && sortedPeople.length > 2 && index < sortedPeople.length - 1
              ? 'border-b border-line pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6'
              : '';

          return (
            <div
              key={person.id}
              className={borderClass}
            >
              <div className="flex items-baseline justify-between border-b border-line pb-1">
                <p className="text-sm font-semibold">{person.name}</p>
                <p className="tabular text-sm font-semibold">
                  {formatMoney(total, currencySymbol)}
                </p>
              </div>
              {items.length === 0 ? (
                <p className="py-3 text-sm text-ink-muted">No income</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {items.map((tx) => {
                    const isExpanded = !!expanded[tx.id];
                    return (
                      <li
                        key={tx.id}
                        className="group py-2 cursor-pointer"
                        onClick={() => toggleExpand(tx.id)}
                      >
                        {/* Top row: Amount + expand indicator + action buttons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-ink-muted">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                            <span className="tabular text-sm font-semibold">
                              {formatMoney(tx.amountMinor, currencySymbol)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(tx);
                                }}
                                className="px-1 py-0.5 text-xs text-denim hover:underline active:opacity-70"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(tx);
                                }}
                                className="px-1 py-0.5 text-xs text-rust hover:underline active:opacity-70"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded content: description and date */}
                        {isExpanded && (
                          <div className="mt-1 pl-4 text-sm text-ink-muted">
                            <p>{tx.description || 'No description'}</p>
                            <p className="text-xs">{formatDate(tx.date)}</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}