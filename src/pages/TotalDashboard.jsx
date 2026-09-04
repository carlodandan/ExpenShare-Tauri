import React, { useEffect, useState } from 'react';
import { useAppContext } from '../contexts/AppContextCore.jsx';
import SummaryCard from '../components/SummaryCard.jsx';
import DonutChart from '../components/DonutChart.jsx';
import { formatMoney, monthLabel } from '../utils/format.js';

export default function TotalDashboard() {
  const { currencySymbol, dataVersion } = useAppContext();
  const [data, setData] = useState(null);
  const [sortDesc, setSortDesc] = useState(true);

  useEffect(() => {
    window.tauriAPI.dashboard.getTotal().then(setData);
  }, [dataVersion]);

  if (!data) {
    return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  }

  const rows = [...data.monthlyPerformance].sort((a, b) =>
    sortDesc ? b.month.localeCompare(a.month) : a.month.localeCompare(b.month)
  );

  // Calculate total savings from breakdown (Savings category)
  const savingsCategory = data.breakdown?.find(b => b.name === 'Savings');
  const totalSavings = savingsCategory?.totalMinor || 0;

  return (
    <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
      <h1 className="text-lg font-semibold">Total Dashboard</h1>
      <p className="text-xs text-ink-muted mt-0.5">
         Shows your accumulated budget and financial activity across all previous months, including the current month.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4 lg:grid-cols-4">
        <SummaryCard label="Total Gross" minor={data.grossMinor} tone="neutral" />
        <SummaryCard label="Total Expenses" minor={data.expensesMinor} tone="negative" />
        <SummaryCard label="Total Net" minor={data.netMinor} tone="auto" />
        <SummaryCard label="Total Savings" minor={totalSavings} tone="positive" />
      </div>

      <section className="mt-6 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:mt-8 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          Expense Breakdown
        </h2>
        <DonutChart data={data.breakdown} />
      </section>

      <section className="mt-6 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
            Monthly Performance
          </h2>
          <button
            type="button"
            onClick={() => setSortDesc((s) => !s)}
            className="text-xs text-denim hover:underline active:opacity-70"
          >
            {sortDesc ? 'Oldest first' : 'Newest first'}
          </button>
        </div>
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">No monthly history yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-sm">
              <thead>
                <tr className="ledger-rule text-left text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 font-medium">Month</th>
                  <th className="py-2 text-right font-medium">Gross</th>
                  <th className="py-2 text-right font-medium">Expenses</th>
                  <th className="py-2 text-right font-medium">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr key={row.month}>
                    <td className="py-2 whitespace-nowrap">{monthLabel(row.month)}</td>
                    <td className="tabular py-2 text-right whitespace-nowrap">{formatMoney(row.grossMinor, currencySymbol)}</td>
                    <td className="tabular py-2 text-right text-rust whitespace-nowrap">
                      {formatMoney(row.expensesMinor, currencySymbol)}
                    </td>
                    <td
                      className={`tabular py-2 text-right font-medium whitespace-nowrap ${
                        row.netMinor < 0 ? 'text-rust' : 'text-moss'
                      }`}
                    >
                      {formatMoney(row.netMinor, currencySymbol)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-line bg-paper/80 px-4 py-3.5 sm:px-5 sm:py-4">
        <h2 className="mb-3 font-bodoni text-xs uppercase tracking-[0.12em] text-ink-muted">
          Simple Analysis
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-3 text-sm">
          <AnalysisRow label="Average Monthly Income" value={formatMoney(data.analysis.avgGrossMinor, currencySymbol)} />
          <AnalysisRow
            label="Average Monthly Expenses"
            value={formatMoney(data.analysis.avgExpensesMinor, currencySymbol)}
          />
          <AnalysisRow label="Average Monthly Net" value={formatMoney(data.analysis.avgNetMinor, currencySymbol)} />
          <AnalysisRow
            label="Highest Income Month"
            value={data.analysis.highestIncomeMonth ? monthLabel(data.analysis.highestIncomeMonth) : '—'}
          />
          <AnalysisRow
            label="Highest Expense Month"
            value={data.analysis.highestExpenseMonth ? monthLabel(data.analysis.highestExpenseMonth) : '—'}
          />
          <AnalysisRow
            label="Largest Expense Category"
            value={data.analysis.largestExpenseCategory || '—'}
          />
        </dl>
      </section>
    </div>
  );
}

function AnalysisRow({ label, value }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-medium">{value}</dd>
    </div>
  );
}