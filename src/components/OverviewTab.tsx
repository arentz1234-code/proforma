'use client';

import { useState, useMemo } from 'react';
import { DealData } from '@/types';
import { calcMonthlyPayment, calcAnnualDebtService, calcCapRate, calcCashOnCash, calcDSCR, calcDebtYield, calcYearlyProjections } from '@/lib/calculations';
import { formatCurrency, formatCurrencyFull, formatPercent, formatRatio } from '@/utils/format';
import MetricCard from './MetricCard';
import InputField from './InputField';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, DollarSign, Settings, PieChart } from 'lucide-react';

interface OverviewTabProps {
  dealData: DealData;
}

export default function OverviewTab({ dealData }: OverviewTabProps) {
  const [purchasePrice, setPurchasePrice] = useState(dealData.askingPrice);
  const [dpPercent, setDpPercent] = useState(dealData.downPaymentPercent);
  const [interestRate, setInterestRate] = useState(dealData.loanTerms.interestRate);
  const [amortYears, setAmortYears] = useState(dealData.loanTerms.amortizationYears);
  const [holdYears, setHoldYears] = useState(10);
  const [exitCap, setExitCap] = useState(7);

  const metrics = useMemo(() => {
    const dp = purchasePrice * (dpPercent / 100);
    const loan = purchasePrice - dp;
    const monthly = calcMonthlyPayment(loan, interestRate, amortYears);
    const annualDS = calcAnnualDebtService(loan, interestRate, amortYears);
    const noi = dealData.netOperatingIncome;
    const cf = noi - annualDS;

    return {
      dp, loan, monthly, annualDS, noi, cf,
      capRate: calcCapRate(noi, purchasePrice),
      coc: calcCashOnCash(cf, dp),
      dscr: calcDSCR(noi, annualDS),
      debtYield: calcDebtYield(noi, loan),
    };
  }, [purchasePrice, dpPercent, interestRate, amortYears, dealData]);

  const projections = useMemo(() => {
    return calcYearlyProjections(
      {
        purchasePrice, downPaymentPercent: dpPercent, interestRate,
        loanTermYears: 10, amortizationYears: amortYears, vacancyRate: dealData.vacancyRate,
        rentGrowthRate: 3, expenseGrowthRate: 2, holdPeriodYears: holdYears,
        exitCapRate: exitCap, closingCostPercent: 2, sellingCostPercent: 3,
      },
      dealData.grossPotentialRent, dealData.totalExpenses, dealData.otherIncome,
    );
  }, [purchasePrice, dpPercent, interestRate, amortYears, holdYears, exitCap, dealData]);

  const getMetricColor = (metric: string, value: number): 'success' | 'warning' | 'danger' | 'info' => {
    if (metric === 'coc') return value >= 8 ? 'success' : value >= 5 ? 'warning' : 'danger';
    if (metric === 'dscr') return value >= 1.25 ? 'success' : value >= 1.0 ? 'warning' : 'danger';
    if (metric === 'cf') return value >= 0 ? 'success' : 'danger';
    return 'info';
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Cap Rate"
          value={formatPercent(metrics.capRate)}
          color="info"
          size="lg"
        />
        <MetricCard
          label="Cash on Cash"
          value={formatPercent(metrics.coc)}
          color={getMetricColor('coc', metrics.coc)}
          size="lg"
        />
        <MetricCard
          label="DSCR"
          value={formatRatio(metrics.dscr)}
          color={getMetricColor('dscr', metrics.dscr)}
          size="lg"
          subtitle={metrics.dscr >= 1.25 ? 'Lender Ready' : 'Below 1.25x'}
        />
        <MetricCard
          label="Annual Cash Flow"
          value={formatCurrency(metrics.cf)}
          color={getMetricColor('cf', metrics.cf)}
          size="lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assumptions Panel */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-[var(--text-muted)]" />
              <span className="card-title">Deal Assumptions</span>
            </div>
          </div>
          <div className="card-body space-y-4">
            <InputField label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" step={25000} />
            <InputField label="Down Payment" value={dpPercent} onChange={setDpPercent} suffix="%" step={5} min={0} max={100} />
            <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" step={0.125} min={0} max={15} />
            <InputField label="Amortization" value={amortYears} onChange={setAmortYears} suffix="yrs" step={5} min={10} max={40} />

            <div className="divider" />

            <div className="space-y-3">
              <div className="stat-row">
                <span className="stat-label">Loan Amount</span>
                <span className="stat-value">{formatCurrencyFull(metrics.loan)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Monthly Payment</span>
                <span className="stat-value">{formatCurrencyFull(metrics.monthly)}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Annual Debt Service</span>
                <span className="stat-value text-danger">{formatCurrencyFull(metrics.annualDS)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Income Waterfall */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-success" />
              <span className="card-title">Income Waterfall</span>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-0">
              {[
                { label: 'Gross Potential Rent', value: dealData.grossPotentialRent, type: 'income' },
                { label: 'Vacancy Loss', value: -dealData.vacancyLoss, type: 'expense' },
                { label: 'Other Income', value: dealData.otherIncome, type: 'income' },
                { label: 'Effective Gross Income', value: dealData.effectiveGrossIncome, type: 'subtotal' },
                { label: 'Operating Expenses', value: -dealData.totalExpenses, type: 'expense' },
                { label: 'Net Operating Income', value: dealData.netOperatingIncome, type: 'total' },
                { label: 'Debt Service', value: -metrics.annualDS, type: 'expense' },
                { label: 'Cash Flow Before Tax', value: metrics.cf, type: 'final' },
              ].map((row, i) => (
                <div
                  key={i}
                  className={`stat-row ${row.type === 'subtotal' || row.type === 'total' || row.type === 'final' ? 'highlight' : ''}`}
                >
                  <span className={`stat-label ${row.type === 'total' || row.type === 'final' ? 'font-semibold' : ''}`}>
                    {row.label}
                  </span>
                  <span className={`stat-value ${
                    row.type === 'expense' ? 'text-danger' :
                    row.type === 'total' || row.type === 'final' ? (row.value >= 0 ? 'text-success' : 'text-danger') :
                    row.type === 'income' ? 'text-success' : ''
                  } ${row.type === 'final' ? 'number-md' : ''}`}>
                    {row.value < 0 ? '-' : ''}{formatCurrencyFull(Math.abs(row.value))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projection Chart */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-info" />
            <span className="card-title">{holdYears}-Year Investment Projection</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Hold:</span>
              <InputField value={holdYears} onChange={setHoldYears} suffix="yrs" step={1} min={1} max={30} size="sm" />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[var(--text-muted)]">Exit Cap:</span>
              <InputField value={exitCap} onChange={setExitCap} suffix="%" step={0.25} min={3} max={15} size="sm" />
            </div>
          </div>
        </div>
        <div className="card-body">
          <div className="text-xs text-[var(--text-muted)] mb-4">
            Assumptions: 3% annual rent growth, 2% expense growth
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={projections}>
              <defs>
                <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis
                dataKey="year"
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <YAxis
                tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`}
                tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <Tooltip
                formatter={(value) => formatCurrencyFull(value as number)}
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: 'var(--text-primary)' }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="equity"
                stroke="#10b981"
                fill="url(#equityGradient)"
                name="Total Equity"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="cumulativeCashFlow"
                stroke="#3b82f6"
                fill="url(#cfGradient)"
                name="Cumulative Cash Flow"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="noi"
                stroke="#f59e0b"
                name="NOI"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year by Year Table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Annual Projections</span>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Year</th>
                <th className="text-right">Gross Income</th>
                <th className="text-right">Expenses</th>
                <th className="text-right">NOI</th>
                <th className="text-right">Debt Service</th>
                <th className="text-right">Cash Flow</th>
                <th className="text-right">Property Value</th>
                <th className="text-right">Equity</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((year) => (
                <tr key={year.year}>
                  <td className="font-medium">Year {year.year}</td>
                  <td className="text-right text-success">{formatCurrency(year.grossIncome)}</td>
                  <td className="text-right text-danger">{formatCurrency(year.operatingExpenses)}</td>
                  <td className="text-right font-medium">{formatCurrency(year.noi)}</td>
                  <td className="text-right text-danger">{formatCurrency(year.debtService)}</td>
                  <td className={`text-right font-medium ${year.cashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(year.cashFlow)}
                  </td>
                  <td className="text-right">{formatCurrency(year.propertyValue)}</td>
                  <td className="text-right text-info font-medium">{formatCurrency(year.equity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
