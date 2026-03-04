'use client';

import { useState } from 'react';
import { DealData, Scenario, ScenarioAssumptions } from '@/types';
import { calcScenarioResults } from '@/lib/calculations';
import TabNavigation, { TabPanel } from '@/components/ui/TabNavigation';
import FileUpload from '@/components/FileUpload';
import OverviewTab from '@/components/OverviewTab';
import DealEvaluationTab from '@/components/DealEvaluationTab';
import ScenarioManager from '@/components/ScenarioManager';
import ReverseAnalysis from '@/components/ReverseAnalysis';
import NapkinCalculator, { NapkinData } from '@/components/NapkinCalculator';
import ExportButton from '@/components/ExportButton';
import { FileText, Calculator, Upload, ArrowLeft, BarChart3 } from 'lucide-react';

type EntryMode = 'select' | 'napkin' | 'upload';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'evaluation', label: 'Due Diligence' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'reverse', label: 'Sensitivity' },
];

export default function Home() {
  const [dealData, setDealData] = useState<DealData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>('select');
  const [showDetailedView, setShowDetailedView] = useState(false);

  const handleDataParsed = (data: DealData) => {
    setDealData(data);
    setShowDetailedView(true);
    const assumptions: ScenarioAssumptions = {
      purchasePrice: data.askingPrice,
      downPaymentPercent: data.downPaymentPercent,
      interestRate: data.loanTerms.interestRate,
      loanTermYears: data.loanTerms.termYears,
      amortizationYears: data.loanTerms.amortizationYears,
      vacancyRate: data.vacancyRate,
      rentGrowthRate: 3,
      expenseGrowthRate: 2,
      holdPeriodYears: 10,
      exitCapRate: 7,
      closingCostPercent: 2,
      sellingCostPercent: 3,
    };
    const results = calcScenarioResults(
      assumptions,
      data.grossPotentialRent,
      data.totalExpenses,
      data.otherIncome,
      data.property.totalUnits || undefined,
      data.property.totalSF
    );
    setScenarios([{ id: 'base', name: 'Base Case', assumptions, results }]);
  };

  const handleExpandToDetailed = (napkinData: NapkinData) => {
    const totalSF = napkinData.units * 1000;
    const grossPotentialRent = napkinData.units * napkinData.rentPerUnit * 12;
    const totalExpenses = grossPotentialRent * (napkinData.expenseRatio / 100);
    const noi = grossPotentialRent - totalExpenses;
    const loanAmount = napkinData.purchasePrice * (napkinData.ltv / 100);

    const data: DealData = {
      property: {
        name: 'Quick Analysis',
        address: napkinData.market + ' Market',
        propertyType: 'Multifamily',
        totalUnits: napkinData.units,
        totalSF,
        occupancyRate: 95,
      },
      askingPrice: napkinData.purchasePrice,
      pricePerUnit: napkinData.purchasePrice / napkinData.units,
      pricePerSF: napkinData.purchasePrice / totalSF,
      rentRoll: [{
        unitNumber: 'Summary',
        tenant: 'Various',
        squareFeet: totalSF,
        rentPerSF: napkinData.rentPerUnit * 12 / 1000,
        monthlyRent: napkinData.units * napkinData.rentPerUnit,
        annualRent: grossPotentialRent,
      }],
      grossPotentialRent,
      vacancyRate: 5,
      vacancyLoss: grossPotentialRent * 0.05,
      otherIncome: 0,
      effectiveGrossIncome: grossPotentialRent * 0.95,
      expenses: [{ category: 'Operating Expenses', annualAmount: totalExpenses }],
      totalExpenses,
      expenseRatio: napkinData.expenseRatio,
      managementFee: totalExpenses * 0.25,
      replacementReserves: napkinData.units * 250,
      netOperatingIncome: noi,
      loanTerms: {
        loanAmount,
        interestRate: napkinData.interestRate,
        termYears: 10,
        amortizationYears: napkinData.amortYears,
        loanType: 'Fixed',
        isInterestOnly: false,
      },
      downPaymentPercent: 100 - napkinData.ltv,
    };

    handleDataParsed(data);
  };

  const resetToEntry = () => {
    setDealData(null);
    setShowDetailedView(false);
    setScenarios([]);
    setEntryMode('select');
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">
            <BarChart3 size={20} />
          </div>
          <span className="app-logo-text">ProForma</span>
        </div>

        <div className="flex items-center gap-4">
          {dealData && showDetailedView && (
            <div className="flex items-center gap-3">
              <span className="badge badge-info">{dealData.property.propertyType}</span>
              <span className="text-sm text-[var(--text-secondary)]">{dealData.property.name}</span>
            </div>
          )}
          <ExportButton dealData={dealData} scenarios={scenarios} />
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-[1600px] mx-auto w-full">
        {/* Landing Page - Mode Selection */}
        {!showDetailedView && entryMode === 'select' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-3">Multifamily Deal Analyzer</h1>
              <p className="text-lg text-[var(--text-secondary)]">
                Underwrite apartment acquisitions in minutes
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
              {/* Upload OM Card */}
              <button
                onClick={() => setEntryMode('upload')}
                className="group p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-blue)] hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--accent-blue)]/15 transition-colors">
                  <Upload size={28} className="text-[var(--accent-blue)]" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Upload an OM</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Upload a PDF or Excel offering memorandum and let AI extract the key data automatically
                </p>
              </button>

              {/* Quick Underwriting Card */}
              <button
                onClick={() => setEntryMode('napkin')}
                className="group p-8 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--accent-blue)] hover:shadow-lg transition-all text-left"
              >
                <div className="w-14 h-14 rounded-lg bg-[var(--accent-blue)]/10 flex items-center justify-center mb-5 group-hover:bg-[var(--accent-blue)]/15 transition-colors">
                  <Calculator size={28} className="text-[var(--accent-blue)]" />
                </div>
                <h2 className="text-lg font-semibold mb-2">Quick Underwriting</h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Napkin math calculator for fast deal screening with units, rent, and expense ratio
                </p>
              </button>
            </div>
          </div>
        )}

        {/* Napkin Calculator Mode */}
        {!showDetailedView && entryMode === 'napkin' && (
          <div className="space-y-6">
            <button
              onClick={() => setEntryMode('select')}
              className="btn btn-ghost"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <NapkinCalculator
              initialData={dealData}
              onExpandToDetailed={handleExpandToDetailed}
            />
          </div>
        )}

        {/* Upload Mode */}
        {!showDetailedView && entryMode === 'upload' && (
          <div className="space-y-6">
            <button
              onClick={() => setEntryMode('select')}
              className="btn btn-ghost"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <div className="max-w-2xl mx-auto">
              <FileUpload
                onDataParsed={handleDataParsed}
                isProcessing={isProcessing}
                setIsProcessing={setIsProcessing}
              />
            </div>
          </div>
        )}

        {/* Detailed Analysis View */}
        {dealData && showDetailedView && (
          <div className="space-y-6">
            {/* Back Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowDetailedView(false)}
                className="btn btn-ghost"
              >
                <ArrowLeft size={16} />
                Back to Calculator
              </button>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <FileText size={14} className="text-success" />
                  <span className="text-[var(--text-secondary)]">
                    {dealData.property.name}
                  </span>
                  {dealData.property.totalUnits && (
                    <span className="badge badge-success">{dealData.property.totalUnits} Units</span>
                  )}
                </div>
                <button onClick={resetToEntry} className="btn btn-secondary btn-sm">
                  New Analysis
                </button>
              </div>
            </div>

            {/* Property Summary Card */}
            <div className="quick-stats">
              <div className="quick-stat">
                <span className="quick-stat-label">Purchase Price</span>
                <span className="quick-stat-value">${(dealData.askingPrice / 1000000).toFixed(2)}M</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Units</span>
                <span className="quick-stat-value">{dealData.property.totalUnits}</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Price / Unit</span>
                <span className="quick-stat-value">${((dealData.askingPrice / (dealData.property.totalUnits || 1)) / 1000).toFixed(0)}K</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">NOI</span>
                <span className="quick-stat-value text-success">${(dealData.netOperatingIncome / 1000).toFixed(0)}K</span>
              </div>
              <div className="quick-stat">
                <span className="quick-stat-label">Cap Rate</span>
                <span className="quick-stat-value text-info">
                  {((dealData.netOperatingIncome / dealData.askingPrice) * 100).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Tabs */}
            <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <TabPanel id="overview" activeTab={activeTab}>
              <OverviewTab dealData={dealData} />
            </TabPanel>

            <TabPanel id="evaluation" activeTab={activeTab}>
              <DealEvaluationTab dealData={dealData} />
            </TabPanel>

            <TabPanel id="scenarios" activeTab={activeTab}>
              <ScenarioManager
                dealData={dealData}
                scenarios={scenarios}
                onScenariosChange={setScenarios}
              />
            </TabPanel>

            <TabPanel id="reverse" activeTab={activeTab}>
              <ReverseAnalysis dealData={dealData} />
            </TabPanel>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-color)] py-4 px-8 text-center text-sm text-[var(--text-muted)]">
        ProForma Deal Analyzer
      </footer>
    </div>
  );
}
