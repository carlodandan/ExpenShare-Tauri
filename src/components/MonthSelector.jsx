import React from 'react';
import { monthLabel } from '../utils/format.js';

export default function MonthSelector({ month, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        aria-label="Previous month"
        onClick={() => onChange(shift(month, -1))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface"
      >
        ‹
      </button>
      <span className="min-w-[10ch] text-center text-sm font-medium">{monthLabel(month)}</span>
      <button
        type="button"
        aria-label="Next month"
        onClick={() => onChange(shift(month, 1))}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-muted hover:bg-surface"
      >
        ›
      </button>
    </div>
  );
}

function shift(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}
