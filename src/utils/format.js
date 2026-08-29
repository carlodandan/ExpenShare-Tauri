/** Renderer-side helpers. All money arrives from the main process as
 * integer minor units (centavos); we only ever format it here, never do
 * float arithmetic on it. */

export function formatMoney(minor, symbol = '₱') {
  const value = (minor ?? 0) / 100;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  return `${sign}${symbol}${abs.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function toMinorUnits(majorAmountString) {
  const n = Number(majorAmountString);
  if (!Number.isFinite(n)) return NaN;
  return Math.round(n * 100);
}

export function toMajorUnits(minor) {
  if (minor == null || Number.isNaN(Number(minor))) return 0;
  return Number(minor) / 100;
}

export function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${String(newM).padStart(2, '0')}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${formatDate(dateStr)} · ${d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function todayInputValue() {
  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  return new Date(now - tzOffset).toISOString().slice(0, 10);
}
