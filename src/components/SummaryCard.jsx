import React from 'react';
import { formatMoney } from '../utils/format.js';
import { useAppContext } from '../hooks/AppContext.jsx';

const TONE_CLASSES = {
  neutral: 'text-ink',
  positive: 'text-moss',
  negative: 'text-rust',
  extra: 'text-denim',
};

export default function SummaryCard({ label, minor, tone = 'neutral', sublabel }) {
  const { currencySymbol } = useAppContext();
  const resolvedTone = tone === 'auto' ? (minor < 0 ? 'negative' : 'positive') : tone;

  return (
    <div className="rounded-lg border border-line bg-surface px-5 py-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-muted">{label}</p>
      <p className={`tabular mt-1 text-2xl font-semibold ${TONE_CLASSES[resolvedTone]}`}>
        {formatMoney(minor, currencySymbol)}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}
