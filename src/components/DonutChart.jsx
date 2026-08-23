import React from 'react';
import { formatMoney } from '../utils/format.js';
import { useAppContext } from '../hooks/AppContext.jsx';

const SLICE_COLORS = ['#2f6f4f', '#3b5ba5', '#a6452b', '#8a7a3a', '#5b7a8c', '#7a5b8c', '#5b6660'];

export default function DonutChart({ data }) {
  const { currencySymbol } = useAppContext();
  const total = data.reduce((sum, d) => sum + d.totalMinor, 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-ink-muted">No expenses recorded yet.</p>;
  }

  const radius = 60;
  const stroke = 26;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  const slices = data
    .filter((d) => d.totalMinor > 0)
    .map((d, i) => {
      const fraction = d.totalMinor / total;
      const dash = fraction * circumference;
      const slice = {
        name: d.name,
        pct: fraction * 100,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
        dasharray: `${dash} ${circumference - dash}`,
        dashoffset: -offset,
      };
      offset += dash;
      return slice;
    });

  return (
    <div className="flex items-center gap-8">
      <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="Expense breakdown by category">
        <g transform="translate(80,80) rotate(-90)">
          <circle r={radius} fill="none" stroke="var(--color-line)" strokeWidth={stroke} />
          {slices.map((s) => (
            <circle
              key={s.name}
              r={radius}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={s.dasharray}
              strokeDashoffset={s.dashoffset}
            />
          ))}
        </g>
      </svg>
      <ul className="flex-1 space-y-1.5">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden="true"
              />
              {s.name}
            </span>
            <span className="tabular text-ink-muted">{s.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
