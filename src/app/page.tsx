'use client';

import { useState, useEffect } from 'react';
import { DealData, Scenario, ScenarioAssumptions } from '@/types';
import { calcScenarioResults } from '@/lib/calculations';
import TabNavigation, { TabPanel } from '@/components/ui/TabNavigation';
import ApiKeyInput from '@/components/ApiKeyInput';
import FileUpload from '@/components/FileUpload';
import OverviewTab from '@/components/OverviewTab';
import DealEvaluationTab from '@/components/DealEvaluationTab';
import ScenarioManager from '@/components/ScenarioManager';
import ReverseAnalysis from '@/components/ReverseAnalysis';
import NapkinCalculator, { NapkinData } from '@/components/NapkinCalculator';
import ManualEntry from '@/components/ManualEntry';
import ExportButton from '@/components/ExportButton';
import { Building2, FileText, Calculator, PenLine, Upload, ArrowLeft, BarChart3 } from 'lucide-react';

type EntryMode = 'napkin' | 'upload' | 'manual';

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'evaluation', label: 'Due Diligence' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'reverse', label: 'Sensitivity' },
];

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [dealData, setDealData] = useState<DealData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [entryMode, setEntryMode] = useState<EntryMode>('napkin');
  const [showDetailedView, setShowDetailedView] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('gemini_api_key');
    if (saved) setApiKey(saved);
  }, []);

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
        {/* Mode Selection */}
        {!showDetailedView && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">Multifamily Deal Analyzer</h1>
              <p className="text-[var(--text-secondary)]">
                Quick underwriting for multifamily acquisitions
              </p>
            </div>

            {/* Entry Mode Tabs */}
            <div className="flex justify-center mb-8">
              <div className="nav-pills">
                <button
                  onClick={() => setEntryMode('napkin')}
                  className={`nav-pill ${entryMode === 'napkin' ? 'active' : ''}`}
                >
                  <Calculator size={18} />
                  Quick Calculator
                </button>
                <button
                  onClick={() => setEntryMode('upload')}
                  className={`nav-pill ${entryMode === 'upload' ? 'active' : ''}`}
                >
                  <Upload size={18} />
                  Upload OM
                </button>
                <button
                  onClick={() => setEntryMode('manual')}
                  className={`nav-pill ${entryMode === 'manual' ? 'active' : ''}`}
                >
                  <PenLine size={18} />
                  Build Proforma
                </button>
              </div>
            </div>

            {/* Napkin Calculator Mode */}
            {entryMode === 'napkin' && (
              <NapkinCalculator
                initialData={dealData}
                onExpandToDetailed={handleExpandToDetailed}
              />
            )}

            {/* Upload Mode */}
            {entryMode === 'upload' && (
              <div className="max-w-2xl mx-auto space-y-6">
                <ApiKeyInput apiKey={apiKey} onApiKeyChange={setApiKey} />
                <FileUpload
                  apiKey={apiKey}
                  onDataParsed={handleDataParsed}
                  isProcessing={isProcessing}
                  setIsProcessing={setIsProcessing}
                />
              </div>
            )}

            {/* Manual Entry Mode */}
            {entryMode === 'manual' && (
              <ManualEntry onSubmit={handleDataParsed} />
            )}
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
