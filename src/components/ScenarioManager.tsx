'use client';

import { useState, useMemo } from 'react';
import { DealData, Scenario, ScenarioAssumptions } from '@/types';
import { calcScenarioResults } from '@/lib/calculations';
import { formatCurrency, formatPercent, formatRatio } from '@/utils/format';
import InputField from './InputField';
import { Plus, X } from 'lucide-react';

interface ScenarioManagerProps {
  dealData: DealData;
  scenarios: Scenario[];
  onScenariosChange: (scenarios: Scenario[]) => void;
}

function makeDefaultAssumptions(d: DealData): ScenarioAssumptions {
  return {
    purchasePrice: d.askingPrice,
    downPaymentPercent: d.downPaymentPercent,
    interestRate: d.loanTerms.interestRate,
    loanTermYears: d.loanTerms.termYears,
    amortizationYears: d.loanTerms.amortizationYears,
    vacancyRate: d.vacancyRate,
    rentGrowthRate: 3,
    expenseGrowthRate: 2,
    holdPeriodYears: 10,
    exitCapRate: 7,
    closingCostPercent: 2,
    sellingCostPercent: 3,
  };
}

export default function ScenarioManager({ dealData, scenarios, onScenariosChange }: ScenarioManagerProps) {
  const addScenario = () => {
    if (scenarios.length >= 4) return;
    const assumptions = makeDefaultAssumptions(dealData);
    const results = calcScenarioResults(assumptions, dealData.grossPotentialRent, dealData.totalExpenses, dealData.otherIncome, dealData.property.totalUnits || undefined, dealData.property.totalSF);
    onScenariosChange([...scenarios, {
      id: Date.now().toString(),
      name: `Scenario ${scenarios.length + 1}`,
      assumptions,
      results,
    }]);
  };

  const removeScenario = (id: string) => {
    onScenariosChange(scenarios.filter(s => s.id !== id));
  };

  const updateAssumption = (id: string, key: keyof ScenarioAssumptions, value: number) => {
    onScenariosChange(scenarios.map(s => {
      if (s.id !== id) return s;
      const newAssumptions = { ...s.assumptions, [key]: value };
      const results = calcScenarioResults(newAssumptions, dealData.grossPotentialRent, dealData.totalExpenses, dealData.otherIncome, dealData.property.totalUnits || undefined, dealData.property.totalSF);
      return { ...s, assumptions: newAssumptions, results };
    }));
  };

  const updateName = (id: string, name: string) => {
    onScenariosChange(scenarios.map(s => s.id === id ? { ...s, name } : s));
  };

  // Find best/worst for highlighting
  const getBest = (getter: (s: Scenario) => number) => {
    if (scenarios.length === 0) return -1;
    let bestIdx = 0;
    scenarios.forEach((s, i) => { if (getter(s) > getter(scenarios[bestIdx])) bestIdx = i; });
    return bestIdx;
  };

  const metrics: { label: string; getter: (s: Scenario) => number; format: (v: number) => string }[] = [
    { label: 'Cap Rate', getter: s => s.results.capRate, format: v => formatPercent(v) },
    { label: 'Cash on Cash', getter: s => s.results.cashOnCashReturn, format: v => formatPercent(v) },
    { label: 'DSCR', getter: s => s.results.dscr, format: v => formatRatio(v) },
    { label: 'Annual Cash Flow', getter: s => s.results.annualCashFlow, format: v => formatCurrency(v) },
    { label: 'IRR', getter: s => s.results.irr, format: v => formatPercent(v) },
    { label: 'Equity Multiple', getter: s => s.results.equityMultiple, format: v => formatRatio(v) },
    { label: 'Exit Value', getter: s => s.results.exitValue, format: v => formatCurrency(v) },
    { label: 'Total Profit', getter: s => s.results.totalProfit, format: v => formatCurrency(v) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Scenario Comparison</h3>
        <button onClick={addScenario} disabled={scenarios.length >= 4} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> Add Scenario
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div className="terminal-card">
          <div className="terminal-body text-center text-[var(--text-muted)] py-8">
            Click &quot;Add Scenario&quot; to start comparing different deal structures
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Scenario Headers */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
              <div></div>
              {scenarios.map(s => (
                <div key={s.id} className="terminal-card p-3">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      value={s.name}
                      onChange={(e) => updateName(s.id, e.target.value)}
                      className="financial-input text-sm font-bold w-full mr-2"
                    />
                    <button onClick={() => removeScenario(s.id)} className="text-[var(--text-muted)] hover:text-[var(--accent-red)]">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Assumptions */}
            <div className="mt-4 space-y-2">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider px-1">Assumptions</div>
              {([
                ['Purchase Price', 'purchasePrice', '$', '', 10000],
                ['Down Payment %', 'downPaymentPercent', '', '%', 1],
                ['Interest Rate', 'interestRate', '', '%', 0.25],
                ['Vacancy Rate', 'vacancyRate', '', '%', 1],
                ['Rent Growth', 'rentGrowthRate', '', '%', 0.5],
                ['Expense Growth', 'expenseGrowthRate', '', '%', 0.5],
                ['Hold Period', 'holdPeriodYears', '', 'yr', 1],
                ['Exit Cap Rate', 'exitCapRate', '', '%', 0.25],
              ] as const).map(([label, key, prefix, suffix, step]) => (
                <div key={key} className="grid gap-4 items-center" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
                  <div className="text-sm text-[var(--text-secondary)]">{label}</div>
                  {scenarios.map(s => (
                    <InputField key={s.id} label="" value={s.assumptions[key as keyof ScenarioAssumptions] as number} onChange={(v) => updateAssumption(s.id, key as keyof ScenarioAssumptions, v)} prefix={prefix} suffix={suffix} step={step as number} />
                  ))}
                </div>
              ))}
            </div>

            {/* Results */}
            <div className="mt-6 space-y-1">
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider px-1 mb-2">Results</div>
              {metrics.map(({ label, getter, format }) => {
                const bestIdx = getBest(getter);
                return (
                  <div key={label} className="grid gap-4 items-center py-2 border-b border-[var(--border-color)]/50" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
                    <div className="text-sm text-[var(--text-secondary)]">{label}</div>
                    {scenarios.map((s, i) => (
                      <div key={s.id} className={`text-sm font-bold px-3 py-1 rounded ${i === bestIdx ? 'text-[var(--accent-green)] bg-[rgba(34,197,94,0.1)]' : ''}`}>
                        {format(getter(s))}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
