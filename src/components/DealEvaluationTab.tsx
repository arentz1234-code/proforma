'use client';

import { DealData } from '@/types';
import { formatCurrencyFull, formatPercent, formatNumber } from '@/utils/format';
import { calcAmortizationSchedule } from '@/lib/calculations';
import { Building, FileText, Landmark, TrendingDown } from 'lucide-react';

interface DealEvaluationTabProps {
  dealData: DealData;
}

export default function DealEvaluationTab({ dealData }: DealEvaluationTabProps) {
  const amortSchedule = calcAmortizationSchedule(
    dealData.loanTerms.loanAmount,
    dealData.loanTerms.interestRate,
    dealData.loanTerms.amortizationYears,
  );

  const yearlySummary = amortSchedule.filter((_, i) => (i + 1) % 12 === 0).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Property Info */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Building size={16} className="text-info" />
            <span className="card-title">Property Information</span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Name</p>
              <p className="font-medium">{dealData.property.name}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Address</p>
              <p className="font-medium">{dealData.property.address}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Type</p>
              <span className="badge badge-info">{dealData.property.propertyType}</span>
            </div>
            {dealData.property.totalUnits && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Units</p>
                <p className="font-medium">{dealData.property.totalUnits}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Total SF</p>
              <p className="font-medium">{formatNumber(dealData.property.totalSF)}</p>
            </div>
            {dealData.property.yearBuilt && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Year Built</p>
                <p className="font-medium">{dealData.property.yearBuilt}</p>
              </div>
            )}
            {dealData.property.occupancyRate && (
              <div>
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Occupancy</p>
                <p className="font-medium text-success">{formatPercent(dealData.property.occupancyRate)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Price / SF</p>
              <p className="font-medium">{formatCurrencyFull(dealData.pricePerSF)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rent Roll */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-success" />
            <span className="card-title">Rent Roll</span>
          </div>
          <span className="badge badge-success">GPR: {formatCurrencyFull(dealData.grossPotentialRent)}</span>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Unit</th>
                <th>Tenant</th>
                <th className="text-right">SF</th>
                <th className="text-right">Rent/SF</th>
                <th className="text-right">Monthly</th>
                <th className="text-right">Annual</th>
              </tr>
            </thead>
            <tbody>
              {dealData.rentRoll.map((entry, i) => (
                <tr key={i}>
                  <td className="font-medium">{entry.unitNumber}</td>
                  <td className="text-[var(--text-secondary)]">{entry.tenant}</td>
                  <td className="text-right">{formatNumber(entry.squareFeet)}</td>
                  <td className="text-right">{formatCurrencyFull(entry.rentPerSF)}</td>
                  <td className="text-right">{formatCurrencyFull(entry.monthlyRent)}</td>
                  <td className="text-right text-success font-medium">{formatCurrencyFull(entry.annualRent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <TrendingDown size={16} className="text-danger" />
            <span className="card-title">Operating Expenses</span>
          </div>
          <span className="badge badge-warning">{formatPercent(dealData.expenseRatio)} Ratio</span>
        </div>
        <div className="card-body overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-right">Annual</th>
                {dealData.property.totalUnits && <th className="text-right">Per Unit</th>}
                {dealData.property.totalSF > 0 && <th className="text-right">Per SF</th>}
                <th className="text-right">% of GPR</th>
              </tr>
            </thead>
            <tbody>
              {dealData.expenses.map((exp, i) => (
                <tr key={i}>
                  <td className="font-medium">{exp.category}</td>
                  <td className="text-right text-danger">{formatCurrencyFull(exp.annualAmount)}</td>
                  {dealData.property.totalUnits && (
                    <td className="text-right">{formatCurrencyFull(exp.annualAmount / dealData.property.totalUnits)}</td>
                  )}
                  {dealData.property.totalSF > 0 && (
                    <td className="text-right">{formatCurrencyFull(exp.annualAmount / dealData.property.totalSF)}</td>
                  )}
                  <td className="text-right text-[var(--text-muted)]">
                    {((exp.annualAmount / dealData.grossPotentialRent) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
              <tr className="font-semibold bg-[var(--bg-hover)]">
                <td>Total Expenses</td>
                <td className="text-right text-danger">{formatCurrencyFull(dealData.totalExpenses)}</td>
                {dealData.property.totalUnits && (
                  <td className="text-right">{formatCurrencyFull(dealData.totalExpenses / dealData.property.totalUnits)}</td>
                )}
                {dealData.property.totalSF > 0 && (
                  <td className="text-right">{formatCurrencyFull(dealData.totalExpenses / dealData.property.totalSF)}</td>
                )}
                <td className="text-right">{formatPercent(dealData.expenseRatio)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Debt Analysis */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Landmark size={16} className="text-primary" />
            <span className="card-title">Debt Analysis</span>
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Loan Amount</p>
              <p className="number-sm">{formatCurrencyFull(dealData.loanTerms.loanAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Interest Rate</p>
              <p className="number-sm text-primary">{formatPercent(dealData.loanTerms.interestRate)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Term</p>
              <p className="number-sm">{dealData.loanTerms.termYears} years</p>
            </div>
            <div>
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">Amortization</p>
              <p className="number-sm">{dealData.loanTerms.amortizationYears} years</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="text-right">Annual Payment</th>
                  <th className="text-right">Principal</th>
                  <th className="text-right">Interest</th>
                  <th className="text-right">Ending Balance</th>
                </tr>
              </thead>
              <tbody>
                {yearlySummary.map((row, i) => {
                  const yearStart = i * 12;
                  const yearRows = amortSchedule.slice(yearStart, yearStart + 12);
                  const totalPrincipal = yearRows.reduce((s, r) => s + r.principal, 0);
                  const totalInterest = yearRows.reduce((s, r) => s + r.interest, 0);
                  return (
                    <tr key={i}>
                      <td className="font-medium">Year {i + 1}</td>
                      <td className="text-right">{formatCurrencyFull(row.payment * 12)}</td>
                      <td className="text-right text-success">{formatCurrencyFull(totalPrincipal)}</td>
                      <td className="text-right text-danger">{formatCurrencyFull(totalInterest)}</td>
                      <td className="text-right font-medium">{formatCurrencyFull(row.balance)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
