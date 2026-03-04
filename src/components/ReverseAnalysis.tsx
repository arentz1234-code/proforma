'use client';

import { useState, useMemo } from 'react';
import { DealData } from '@/types';
import { requiredPriceForCoC, requiredRentForCapRate, maxVacancyForDSCR, calcAnnualDebtService, calcCapRate, calcCashOnCash, calcMonthlyPayment } from '@/lib/calculations';
import { formatCurrencyFull, formatPercent, formatCurrency } from '@/utils/format';
import InputField from './InputField';
import MetricCard from './MetricCard';
import { Target } from 'lucide-react';

interface ReverseAnalysisProps {
  dealData: DealData;
}

export default function ReverseAnalysis({ dealData }: ReverseAnalysisProps) {
  const [targetCoC, setTargetCoC] = useState(10);
  const [targetCapRate, setTargetCapRate] = useState(7);
  const [targetDSCR, setTargetDSCR] = useState(1.25);

  const annualDS = calcAnnualDebtService(
    dealData.loanTerms.loanAmount,
    dealData.loanTerms.interestRate,
    dealData.loanTerms.amortizationYears,
  );

  const results = useMemo(() => {
    const reqPrice = requiredPriceForCoC(
      dealData.netOperatingIncome, targetCoC, dealData.downPaymentPercent,
      dealData.loanTerms.interestRate, dealData.loanTerms.amortizationYears, 2,
    );
    const reqRent = requiredRentForCapRate(
      targetCapRate, dealData.askingPrice, dealData.totalExpenses,
      dealData.vacancyRate, dealData.otherIncome, dealData.property.totalSF,
    );
    const maxVac = maxVacancyForDSCR(
      targetDSCR, annualDS, dealData.grossPotentialRent,
      dealData.totalExpenses, dealData.otherIncome,
    );
    return { reqPrice, reqRent, maxVac };
  }, [targetCoC, targetCapRate, targetDSCR, dealData, annualDS]);

  // Sensitivity matrix: price range vs rate range
  const priceSteps = [-10, -5, 0, 5, 10];
  const rateSteps = [-1.0, -0.5, 0, 0.5, 1.0];

  const sensitivityMatrix = useMemo(() => {
    return priceSteps.map(ps => {
      const price = dealData.askingPrice * (1 + ps / 100);
      return rateSteps.map(rs => {
        const rate = dealData.loanTerms.interestRate + rs;
        const dp = price * (dealData.downPaymentPercent / 100);
        const loan = price - dp;
        const ds = calcAnnualDebtService(loan, rate, dealData.loanTerms.amortizationYears);
        const cf = dealData.netOperatingIncome - ds;
        const closing = price * 0.02;
        return calcCashOnCash(cf, dp + closing);
      });
    });
  }, [dealData]);

  return (
    <div className="space-y-6">
      {/* Target Inputs */}
      <div className="terminal-card">
        <div className="terminal-header">
          <Target size={16} className="text-[var(--accent-cyan)]" />
          <span className="terminal-title">Set Your Target Returns</span>
        </div>
        <div className="terminal-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <InputField label="Target Cash-on-Cash %" value={targetCoC} onChange={setTargetCoC} suffix="%" step={0.5} />
            <InputField label="Target Cap Rate %" value={targetCapRate} onChange={setTargetCapRate} suffix="%" step={0.25} />
            <InputField label="Target DSCR" value={targetDSCR} onChange={setTargetDSCR} step={0.05} min={0} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="terminal-card">
          <div className="terminal-body text-center">
            <div className="text-xs text-[var(--text-muted)] uppercase mb-2">For {formatPercent(targetCoC)} Cash-on-Cash</div>
            <div className="text-xl font-bold text-[var(--accent-cyan)]">{formatCurrencyFull(results.reqPrice)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Required Purchase Price</div>
            <div className="text-xs mt-2">
              <span className={results.reqPrice > dealData.askingPrice ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}>
                {results.reqPrice > dealData.askingPrice ? 'Above' : 'Below'} asking by {formatCurrencyFull(Math.abs(results.reqPrice - dealData.askingPrice))}
              </span>
            </div>
          </div>
        </div>
        <div className="terminal-card">
          <div className="terminal-body text-center">
            <div className="text-xs text-[var(--text-muted)] uppercase mb-2">For {formatPercent(targetCapRate)} Cap Rate</div>
            <div className="text-xl font-bold text-[var(--accent-cyan)]">{formatCurrencyFull(results.reqRent)}/SF</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Required Rent per SF</div>
            <div className="text-xs mt-2 text-[var(--text-secondary)]">
              Current: {formatCurrencyFull(dealData.pricePerSF > 0 ? dealData.grossPotentialRent / dealData.property.totalSF : 0)}/SF
            </div>
          </div>
        </div>
        <div className="terminal-card">
          <div className="terminal-body text-center">
            <div className="text-xs text-[var(--text-muted)] uppercase mb-2">For {results.maxVac.toFixed(1)}x DSCR</div>
            <div className="text-xl font-bold text-[var(--accent-cyan)]">{formatPercent(results.maxVac)}</div>
            <div className="text-xs text-[var(--text-muted)] mt-1">Max Vacancy You Can Sustain</div>
            <div className="text-xs mt-2 text-[var(--text-secondary)]">
              Current vacancy: {formatPercent(dealData.vacancyRate)}
            </div>
          </div>
        </div>
      </div>

      {/* Sensitivity Matrix */}
      <div className="terminal-card">
        <div className="terminal-header">
          <div className="terminal-dot green"></div>
          <span className="terminal-title">Sensitivity Analysis: Cash-on-Cash Return</span>
        </div>
        <div className="terminal-body overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="pb-2 text-left text-[var(--text-muted)]">Price \ Rate</th>
                {rateSteps.map(rs => (
                  <th key={rs} className="pb-2 text-center text-[var(--text-muted)]">
                    {formatPercent(dealData.loanTerms.interestRate + rs)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {priceSteps.map((ps, pi) => (
                <tr key={ps} className="border-t border-[var(--border-color)]/50">
                  <td className="py-2 text-[var(--text-secondary)]">
                    {formatCurrency(dealData.askingPrice * (1 + ps / 100))}
                    <span className="text-[var(--text-muted)] text-xs ml-1">({ps >= 0 ? '+' : ''}{ps}%)</span>
                  </td>
                  {rateSteps.map((_, ri) => {
                    const val = sensitivityMatrix[pi]?.[ri] || 0;
                    const bg = val >= 10 ? 'bg-[rgba(34,197,94,0.2)]' : val >= 6 ? 'bg-[rgba(249,115,22,0.15)]' : 'bg-[rgba(239,68,68,0.15)]';
                    const color = val >= 10 ? 'text-[var(--accent-green)]' : val >= 6 ? 'text-[var(--accent-orange)]' : 'text-[var(--accent-red)]';
                    return (
                      <td key={ri} className={`py-2 text-center font-mono ${bg} ${color} rounded`}>
                        {formatPercent(val)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
