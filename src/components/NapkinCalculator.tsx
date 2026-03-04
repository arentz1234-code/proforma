'use client';

import { useState, useMemo } from 'react';
import { formatCurrency, formatPercent } from '@/utils/format';
import InputField from './InputField';
import { calcMonthlyPayment, calcCapRate, calcCashOnCash, calcDSCR, calcDebtYield } from '@/lib/calculations';
import { DealData } from '@/types';
import { ChevronRight } from 'lucide-react';

const MARKET_EXPENSE_RATIOS: Record<string, number> = {
  'FL East': 50,
  'FL West': 40,
  'West Coast': 38,
  'Austin': 40,
  'Houston': 50,
  'Midwest': 45,
};

interface NapkinCalculatorProps {
  initialData?: DealData | null;
  onExpandToDetailed?: (data: NapkinData) => void;
}

export interface NapkinData {
  units: number;
  rentPerUnit: number;
  market: string;
  expenseRatio: number;
  purchasePrice: number;
  ltv: number;
  interestRate: number;
  amortYears: number;
}

export default function NapkinCalculator({ initialData, onExpandToDetailed }: NapkinCalculatorProps) {
  const [units, setUnits] = useState(initialData?.property.totalUnits || 24);
  const [rentPerUnit, setRentPerUnit] = useState(
    initialData ? Math.round(initialData.grossPotentialRent / 12 / (initialData.property.totalUnits || 1)) : 1873
  );
  const [market, setMarket] = useState('FL East');
  const [customExpenseRatio, setCustomExpenseRatio] = useState<number | null>(null);
  const expenseRatio = customExpenseRatio ?? MARKET_EXPENSE_RATIOS[market];
  const [purchasePrice, setPurchasePrice] = useState(initialData?.askingPrice || 6700000);
  const [ltv, setLtv] = useState(80);
  const [interestRate, setInterestRate] = useState(6.2);
  const [amortYears, setAmortYears] = useState(30);
  const [rentIncrease, setRentIncrease] = useState(0);
  const [customCapRate, setCustomCapRate] = useState<number>(6.5);

  const calc = useMemo(() => {
    const monthlyGross = units * rentPerUnit;
    const annualGross = monthlyGross * 12;
    const totalExpenses = annualGross * (expenseRatio / 100);
    const noi = annualGross - totalExpenses;
    const loanAmount = purchasePrice * (ltv / 100);
    const equity = purchasePrice - loanAmount;

    // Interest-Only Scenario
    const annualInterestIO = loanAmount * (interestRate / 100);
    const cashFlowIO = noi - annualInterestIO;
    const cashOnCashIO = equity > 0 ? (cashFlowIO / equity) * 100 : 0;
    const dscrIO = annualInterestIO > 0 ? noi / annualInterestIO : 0;

    // Amortizing Scenario
    const monthlyPayment = calcMonthlyPayment(loanAmount, interestRate, amortYears);
    const annualDebtService = monthlyPayment * 12;
    const cashFlowAmort = noi - annualDebtService;
    const cashOnCashAmort = equity > 0 ? (cashFlowAmort / equity) * 100 : 0;
    const dscrAmort = annualDebtService > 0 ? noi / annualDebtService : 0;

    const capRate = calcCapRate(noi, purchasePrice);
    const dscr = calcDSCR(noi, annualDebtService);
    const debtYield = calcDebtYield(noi, loanAmount);

    const offerWindow = [5, 6, 7, 7.5, 8].map(cap => ({
      capRate: cap,
      price: noi / (cap / 100),
      pricePerUnit: (noi / (cap / 100)) / units,
    }));

    // Custom cap rate calculation
    const customCapPrice = customCapRate > 0 ? noi / (customCapRate / 100) : 0;
    const customCapPricePerUnit = customCapRate > 0 ? customCapPrice / units : 0;

    // Rent bump scenario
    const newRent = rentPerUnit + rentIncrease;
    const newGross = units * newRent * 12;
    const newExpenses = newGross * (expenseRatio / 100);
    const newNoi = newGross - newExpenses;
    const newCashFlow = newNoi - annualDebtService;
    const newCoC = calcCashOnCash(newCashFlow, equity);
    const noiDelta = (units * rentIncrease * 12) * (1 - expenseRatio / 100);

    return {
      monthlyGross, annualGross, totalExpenses, noi, loanAmount, equity,
      monthlyPayment, annualDebtService, capRate,
      // Interest-Only
      annualInterestIO, cashFlowIO, cashOnCashIO, dscrIO,
      // Amortizing
      cashFlowAmort, cashOnCashAmort, dscrAmort,
      // Offer window
      offerWindow, customCapPrice, customCapPricePerUnit,
      // Rent bump (uses IO for simplicity)
      newCashFlow: newNoi - annualInterestIO,
      newCoC: equity > 0 ? ((newNoi - annualInterestIO) / equity) * 100 : 0,
      noiDelta,
    };
  }, [units, rentPerUnit, expenseRatio, purchasePrice, ltv, interestRate, amortYears, rentIncrease, customCapRate]);

  const getColor = (metric: string, value: number) => {
    if (metric === 'coc') return value >= 10 ? 'positive' : value >= 6 ? 'warning' : 'negative';
    if (metric === 'dscr') return value >= 1.25 ? 'positive' : value >= 1.0 ? 'warning' : 'negative';
    return value >= 0 ? 'positive' : 'negative';
  };

  return (
    <div className="space-y-8">
      {/* Results Summary */}
      <div className="results-bar">
        <div className="result-box">
          <div className="result-label">Net Operating Income</div>
          <div className={`result-value ${calc.noi >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(calc.noi)}
          </div>
        </div>
        <div className="result-box">
          <div className="result-label">Cap Rate</div>
          <div className="result-value info">{formatPercent(calc.capRate)}</div>
        </div>
        <div className="result-box">
          <div className="result-label">Cash Flow (IO)</div>
          <div className={`result-value ${calc.cashFlowIO >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(calc.cashFlowIO)}
          </div>
        </div>
        <div className="result-box highlight">
          <div className="result-label">CoC (IO)</div>
          <div className={`result-value ${getColor('coc', calc.cashOnCashIO)}`}>
            {formatPercent(calc.cashOnCashIO)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Inputs */}
        <div className="lg:col-span-2 space-y-8">
          {/* Property & Income */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Property & Income</span>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-4">
                <InputField label="Units" value={units} onChange={setUnits} step={1} min={1} showEditableIndicator={false} />
                <InputField label="Rent / Unit" value={rentPerUnit} onChange={setRentPerUnit} prefix="$" step={25} showEditableIndicator={false} />
                <div className="output-box">
                  <div className="output-label">Monthly Gross</div>
                  <div className="output-value green">{formatCurrency(calc.monthlyGross)}</div>
                </div>
                <div className="output-box">
                  <div className="output-label">Annual Gross</div>
                  <div className="output-value green">{formatCurrency(calc.annualGross)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Operating Expenses</span>
              <span className="badge badge-warning">{expenseRatio}%</span>
            </div>
            <div className="card-body">
              <div className="chip-group mb-4">
                {Object.entries(MARKET_EXPENSE_RATIOS).map(([m, ratio]) => (
                  <button
                    key={m}
                    onClick={() => { setMarket(m); setCustomExpenseRatio(null); }}
                    className={`chip ${market === m && !customExpenseRatio ? 'active' : ''}`}
                  >
                    {m} ({ratio}%)
                  </button>
                ))}
              </div>
              <div className="form-grid form-grid-3">
                <InputField
                  label="Custom Ratio"
                  value={customExpenseRatio ?? ''}
                  onChange={(v) => setCustomExpenseRatio(v || null)}
                  suffix="%"
                  step={1}
                  showEditableIndicator={false}
                />
                <div className="output-box">
                  <div className="output-label">Total Expenses</div>
                  <div className="output-value red">{formatCurrency(calc.totalExpenses)}</div>
                </div>
                <div className="output-box">
                  <div className="output-label">NOI</div>
                  <div className="output-value green">{formatCurrency(calc.noi)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Financing */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Purchase & Financing</span>
            </div>
            <div className="card-body">
              <div className="form-grid form-grid-4 mb-6">
                <InputField label="Purchase Price" value={purchasePrice} onChange={setPurchasePrice} prefix="$" step={25000} showEditableIndicator={false} />
                <InputField label="LTV" value={ltv} onChange={setLtv} suffix="%" step={5} showEditableIndicator={false} />
                <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" step={0.125} showEditableIndicator={false} />
                <InputField label="Amortization" value={amortYears} onChange={setAmortYears} suffix="yrs" step={5} showEditableIndicator={false} />
              </div>
              <div className="section-divider">Loan Summary</div>
              <div className="form-grid form-grid-4">
                <div className="output-box">
                  <div className="output-label">Loan Amount</div>
                  <div className="output-value">{formatCurrency(calc.loanAmount)}</div>
                </div>
                <div className="output-box">
                  <div className="output-label">Equity</div>
                  <div className="output-value blue">{formatCurrency(calc.equity)}</div>
                </div>
                <div className="output-box">
                  <div className="output-label">Monthly Payment</div>
                  <div className="output-value">{formatCurrency(calc.monthlyPayment)}</div>
                </div>
                <div className="output-box">
                  <div className="output-label">Annual Debt Service</div>
                  <div className="output-value red">{formatCurrency(calc.annualDebtService)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metrics & Analysis */}
        <div className="space-y-8">
          {/* Debt Comparison: IO vs Amortizing */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">IO vs Amortizing</span>
            </div>
            <div className="card-body p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th></th>
                    <th className="text-right">Interest Only</th>
                    <th className="text-right">Amortizing</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-muted">Annual Payment</td>
                    <td className="text-right">{formatCurrency(calc.annualInterestIO)}</td>
                    <td className="text-right">{formatCurrency(calc.annualDebtService)}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Cash Flow</td>
                    <td className={`text-right font-semibold ${calc.cashFlowIO >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(calc.cashFlowIO)}
                    </td>
                    <td className={`text-right font-semibold ${calc.cashFlowAmort >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(calc.cashFlowAmort)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Cash on Cash</td>
                    <td className={`text-right font-semibold ${calc.cashOnCashIO >= 10 ? 'text-success' : calc.cashOnCashIO >= 6 ? 'text-warning' : 'text-danger'}`}>
                      {formatPercent(calc.cashOnCashIO)}
                    </td>
                    <td className={`text-right font-semibold ${calc.cashOnCashAmort >= 10 ? 'text-success' : calc.cashOnCashAmort >= 6 ? 'text-warning' : 'text-danger'}`}>
                      {formatPercent(calc.cashOnCashAmort)}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">DSCR</td>
                    <td className={`text-right font-semibold ${calc.dscrIO >= 1.25 ? 'text-success' : calc.dscrIO >= 1.0 ? 'text-warning' : 'text-danger'}`}>
                      {calc.dscrIO.toFixed(2)}x
                    </td>
                    <td className={`text-right font-semibold ${calc.dscrAmort >= 1.25 ? 'text-success' : calc.dscrAmort >= 1.0 ? 'text-warning' : 'text-danger'}`}>
                      {calc.dscrAmort.toFixed(2)}x
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card-footer" style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)' }}>
              <div className="text-xs text-muted">
                <strong>IO:</strong> Interest-only during hold &nbsp;|&nbsp; <strong>Amort:</strong> Full P+I over {amortYears} years
              </div>
            </div>
          </div>

          {/* Offer Window */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Offer Window</span>
            </div>
            <div className="card-body p-0">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cap</th>
                    <th className="text-right">Price</th>
                    <th className="text-right">Per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {calc.offerWindow.map((row, i) => (
                    <tr key={row.capRate} style={i === 2 ? { background: 'rgba(59, 130, 246, 0.1)' } : {}}>
                      <td className="text-info font-semibold">{row.capRate}%</td>
                      <td className="text-right">{formatCurrency(row.price)}</td>
                      <td className="text-right text-muted">{formatCurrency(row.pricePerUnit)}</td>
                    </tr>
                  ))}
                  {/* Custom Cap Rate Row */}
                  <tr style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <td>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={customCapRate}
                          onChange={(e) => setCustomCapRate(parseFloat(e.target.value) || 0)}
                          step={0.25}
                          min={1}
                          max={20}
                          className="w-16 px-2 py-1 text-sm bg-transparent border border-[var(--accent-green)] rounded text-success font-semibold text-center"
                        />
                        <span className="text-success font-semibold">%</span>
                      </div>
                    </td>
                    <td className="text-right text-success font-semibold">{formatCurrency(calc.customCapPrice)}</td>
                    <td className="text-right text-success">{formatCurrency(calc.customCapPricePerUnit)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Rent Bump */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Rent Bump Scenario</span>
            </div>
            <div className="card-body">
              <InputField
                label="Rent Increase / Unit"
                value={rentIncrease}
                onChange={setRentIncrease}
                prefix="$"
                step={25}
                showEditableIndicator={false}
              />
              {rentIncrease > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="stat-row">
                    <span className="stat-label">Additional NOI</span>
                    <span className="stat-value text-success">+{formatCurrency(calc.noiDelta)}</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">New Cash Flow</span>
                    <span className={`stat-value ${calc.newCashFlow >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(calc.newCashFlow)}
                    </span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-label">New Cash on Cash</span>
                    <span className="stat-value text-success">{formatPercent(calc.newCoC)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {onExpandToDetailed && (
            <button
              onClick={() => onExpandToDetailed({
                units, rentPerUnit, market, expenseRatio,
                purchasePrice, ltv, interestRate, amortYears,
              })}
              className="btn btn-primary w-full"
            >
              Full Analysis <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
