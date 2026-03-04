'use client';

import { useState } from 'react';
import { DealData, ExpenseLineItem } from '@/types';
import InputField from './InputField';
import { Building2, Plus, Trash2, DollarSign, Percent, Home, ArrowRight } from 'lucide-react';

interface ManualEntryProps {
  onSubmit: (data: DealData) => void;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  'Real Estate Taxes',
  'Insurance',
  'Property Management',
  'Repairs & Maintenance',
  'Utilities',
  'Administrative',
  'Contract Services',
  'Turnover / Make-Ready',
  'Capital Reserves',
];

export default function ManualEntry({ onSubmit }: ManualEntryProps) {
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [propertyType, setPropertyType] = useState<'Multifamily' | 'Retail' | 'Office' | 'Industrial'>('Multifamily');
  const [yearBuilt, setYearBuilt] = useState<number>(2020);
  const [totalUnits, setTotalUnits] = useState<number>(24);
  const [avgSqFt, setAvgSqFt] = useState<number>(1000);
  const [avgRentPerUnit, setAvgRentPerUnit] = useState<number>(1800);
  const [vacancyRate, setVacancyRate] = useState<number>(5);
  const [otherIncome, setOtherIncome] = useState<number>(0);
  const [useExpenseRatio, setUseExpenseRatio] = useState(true);
  const [expenseRatio, setExpenseRatio] = useState<number>(45);
  const [expenses, setExpenses] = useState<ExpenseLineItem[]>([
    { category: 'Real Estate Taxes', annualAmount: 0 },
    { category: 'Insurance', annualAmount: 0 },
    { category: 'Property Management', annualAmount: 0 },
    { category: 'Repairs & Maintenance', annualAmount: 0 },
    { category: 'Utilities', annualAmount: 0 },
  ]);
  const [askingPrice, setAskingPrice] = useState<number>(6000000);
  const [downPaymentPercent, setDownPaymentPercent] = useState<number>(25);
  const [interestRate, setInterestRate] = useState<number>(6.5);
  const [amortYears, setAmortYears] = useState<number>(30);
  const [loanTerm, setLoanTerm] = useState<number>(10);

  const addExpense = () => {
    setExpenses([...expenses, { category: '', annualAmount: 0 }]);
  };

  const removeExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const updateExpense = (index: number, field: 'category' | 'annualAmount', value: string | number) => {
    const updated = [...expenses];
    if (field === 'category') {
      updated[index].category = value as string;
    } else {
      updated[index].annualAmount = value as number;
    }
    setExpenses(updated);
  };

  const handleSubmit = () => {
    const totalSF = totalUnits * avgSqFt;
    const grossPotentialRent = totalUnits * avgRentPerUnit * 12;
    const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
    const effectiveGrossIncome = grossPotentialRent - vacancyLoss + otherIncome;

    let totalExpenses: number;
    let expenseList: ExpenseLineItem[];

    if (useExpenseRatio) {
      totalExpenses = grossPotentialRent * (expenseRatio / 100);
      expenseList = [{ category: 'Operating Expenses', annualAmount: totalExpenses }];
    } else {
      totalExpenses = expenses.reduce((sum, e) => sum + e.annualAmount, 0);
      expenseList = expenses.filter(e => e.annualAmount > 0);
    }

    const netOperatingIncome = effectiveGrossIncome - totalExpenses;
    const loanAmount = askingPrice * (1 - downPaymentPercent / 100);

    const dealData: DealData = {
      property: {
        name: propertyName || 'New Property',
        address: address || 'Address TBD',
        propertyType,
        yearBuilt,
        totalUnits,
        totalSF,
        occupancyRate: 100 - vacancyRate,
      },
      askingPrice,
      pricePerUnit: askingPrice / totalUnits,
      pricePerSF: askingPrice / totalSF,
      rentRoll: [{
        unitNumber: 'Summary',
        tenant: 'Various',
        squareFeet: totalSF,
        rentPerSF: (avgRentPerUnit * 12) / avgSqFt,
        monthlyRent: totalUnits * avgRentPerUnit,
        annualRent: grossPotentialRent,
      }],
      grossPotentialRent,
      vacancyRate,
      vacancyLoss,
      otherIncome,
      effectiveGrossIncome,
      expenses: expenseList,
      totalExpenses,
      expenseRatio: useExpenseRatio ? expenseRatio : (totalExpenses / grossPotentialRent) * 100,
      managementFee: expenses.find(e => e.category.toLowerCase().includes('management'))?.annualAmount || 0,
      replacementReserves: expenses.find(e => e.category.toLowerCase().includes('reserve'))?.annualAmount || 0,
      netOperatingIncome,
      loanTerms: {
        loanAmount,
        interestRate,
        termYears: loanTerm,
        amortizationYears: amortYears,
        loanType: 'Fixed',
        isInterestOnly: false,
      },
      downPaymentPercent,
    };

    onSubmit(dealData);
  };

  const grossPotentialRent = totalUnits * avgRentPerUnit * 12;
  const calculatedExpenses = useExpenseRatio
    ? grossPotentialRent * (expenseRatio / 100)
    : expenses.reduce((sum, e) => sum + e.annualAmount, 0);
  const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
  const noi = grossPotentialRent - vacancyLoss + otherIncome - calculatedExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property Info */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Home size={16} className="text-info" />
              <span className="card-title">Property Information</span>
            </div>
          </div>
          <div className="card-body space-y-4">
            <InputField label="Property Name" value={propertyName} onChange={setPropertyName} placeholder="Enter property name" />
            <InputField label="Address" value={address} onChange={setAddress} placeholder="Enter address" />
            <div className="input-group">
              <label className="input-label">Property Type</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value as typeof propertyType)}
                className="input-field"
              >
                <option value="Multifamily">Multifamily</option>
                <option value="Retail">Retail</option>
                <option value="Office">Office</option>
                <option value="Industrial">Industrial</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Year Built" value={yearBuilt} onChange={setYearBuilt} step={1} />
              <InputField label="Total Units" value={totalUnits} onChange={setTotalUnits} step={1} min={1} />
            </div>
            <InputField label="Avg SF / Unit" value={avgSqFt} onChange={setAvgSqFt} step={50} min={100} />
          </div>
        </div>

        {/* Income */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-success" />
              <span className="card-title">Income</span>
            </div>
          </div>
          <div className="card-body space-y-4">
            <InputField label="Avg Rent / Unit (Monthly)" value={avgRentPerUnit} onChange={setAvgRentPerUnit} prefix="$" step={25} />
            <InputField label="Vacancy Rate" value={vacancyRate} onChange={setVacancyRate} suffix="%" step={0.5} min={0} max={50} />
            <InputField label="Other Income (Annual)" value={otherIncome} onChange={setOtherIncome} prefix="$" step={1000} />

            <div className="divider" />

            <div className="stat-row">
              <span className="stat-label">Gross Potential Rent</span>
              <span className="stat-value text-success">${grossPotentialRent.toLocaleString()}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Less: Vacancy</span>
              <span className="stat-value text-danger">-${vacancyLoss.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Expenses */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Percent size={16} className="text-warning" />
              <span className="card-title">Expenses</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setUseExpenseRatio(true)}
                className={`btn btn-sm ${useExpenseRatio ? 'btn-primary' : 'btn-ghost'}`}
              >
                Ratio
              </button>
              <button
                onClick={() => setUseExpenseRatio(false)}
                className={`btn btn-sm ${!useExpenseRatio ? 'btn-primary' : 'btn-ghost'}`}
              >
                Line Items
              </button>
            </div>
          </div>
          <div className="card-body space-y-4">
            {useExpenseRatio ? (
              <>
                <InputField label="Expense Ratio" value={expenseRatio} onChange={setExpenseRatio} suffix="%" step={1} min={0} max={80} />
                <div className="stat-row highlight">
                  <span className="stat-label">Total Expenses</span>
                  <span className="stat-value text-danger">${calculatedExpenses.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {expenses.map((expense, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <select
                        value={expense.category}
                        onChange={(e) => updateExpense(i, 'category', e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="">Select category...</option>
                        {DEFAULT_EXPENSE_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        value={expense.annualAmount || ''}
                        onChange={(e) => updateExpense(i, 'annualAmount', Number(e.target.value))}
                        placeholder="$0"
                        className="input-field text-sm"
                      />
                    </div>
                    <button
                      onClick={() => removeExpense(i)}
                      className="btn btn-ghost btn-sm text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button onClick={addExpense} className="btn btn-ghost btn-sm w-full">
                  <Plus size={14} /> Add Line
                </button>
              </div>
            )}

            <div className="divider" />

            <div className="stat-row">
              <span className="stat-label">Expense Ratio</span>
              <span className="stat-value">{((calculatedExpenses / grossPotentialRent) * 100).toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Purchase & Summary Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Purchase & Financing */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-primary" />
              <span className="card-title">Purchase & Financing</span>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <InputField label="Purchase Price" value={askingPrice} onChange={setAskingPrice} prefix="$" step={50000} />
              <InputField label="Down Payment" value={downPaymentPercent} onChange={setDownPaymentPercent} suffix="%" step={5} min={0} max={100} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <InputField label="Interest Rate" value={interestRate} onChange={setInterestRate} suffix="%" step={0.125} min={0} max={15} />
              <InputField label="Loan Term" value={loanTerm} onChange={setLoanTerm} suffix="yrs" step={1} min={1} max={30} />
              <InputField label="Amortization" value={amortYears} onChange={setAmortYears} suffix="yrs" step={5} min={10} max={40} />
            </div>

            <div className="divider" />

            <div className="grid grid-cols-3 gap-4">
              <div className="stat-row">
                <span className="stat-label">Price / Unit</span>
                <span className="stat-value">${(askingPrice / totalUnits).toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Loan Amount</span>
                <span className="stat-value">${(askingPrice * (1 - downPaymentPercent / 100)).toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Equity</span>
                <span className="stat-value text-info">${(askingPrice * (downPaymentPercent / 100)).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Deal Summary</span>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              <div className="stat-row">
                <span className="stat-label">Gross Potential Rent</span>
                <span className="stat-value text-success">${grossPotentialRent.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Vacancy ({vacancyRate}%)</span>
                <span className="stat-value text-danger">-${vacancyLoss.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Other Income</span>
                <span className="stat-value">+${otherIncome.toLocaleString()}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Operating Expenses</span>
                <span className="stat-value text-danger">-${calculatedExpenses.toLocaleString()}</span>
              </div>

              <div className="divider" />

              <div className="stat-row highlight">
                <span className="stat-label font-semibold">Net Operating Income</span>
                <span className={`number-md ${noi >= 0 ? 'text-success' : 'text-danger'}`}>
                  ${noi.toLocaleString()}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Cap Rate</span>
                <span className="stat-value text-info">{((noi / askingPrice) * 100).toFixed(2)}%</span>
              </div>
            </div>

            <button onClick={handleSubmit} className="btn btn-primary w-full mt-6">
              Analyze Deal <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
