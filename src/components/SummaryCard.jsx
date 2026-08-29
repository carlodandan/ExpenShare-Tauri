import React from 'react';
import { formatMoney } from '../utils/format.js';
import { useAppContext } from '../contexts/AppContextCore.jsx';

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
    <div className="rounded-lg border border-line bg-paper/80 px-3.5 py-3 sm:px-5 sm:py-4">
      <p className="font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p className={`tabular mt-1 text-xl font-semibold sm:text-2xl ${TONE_CLASSES[resolvedTone]}`}>
        {formatMoney(minor, currencySymbol)}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-ink-muted">{sublabel}</p>}
    </div>
  );
}
