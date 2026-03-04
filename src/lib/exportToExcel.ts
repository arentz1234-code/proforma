import * as XLSX from 'xlsx';
import { DealData, Scenario } from '@/types';

export function exportToExcel(dealData: DealData, scenarios: Scenario[]) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryData = [
    ['CRE Deal Analysis Summary'],
    [],
    ['Property', dealData.property.name],
    ['Address', dealData.property.address],
    ['Type', dealData.property.propertyType],
    ['Total SF', dealData.property.totalSF],
    ['Units', dealData.property.totalUnits || 'N/A'],
    [],
    ['FINANCIAL SUMMARY'],
    ['Asking Price', dealData.askingPrice],
    ['Gross Potential Rent', dealData.grossPotentialRent],
    ['Vacancy Rate', dealData.vacancyRate / 100],
    ['Effective Gross Income', dealData.effectiveGrossIncome],
    ['Total Expenses', dealData.totalExpenses],
    ['Net Operating Income', dealData.netOperatingIncome],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

  // Income & Expenses
  const incExpData = [
    ['INCOME'],
    ['Unit', 'Tenant', 'SF', 'Rent/SF', 'Monthly', 'Annual'],
    ...dealData.rentRoll.map(r => [r.unitNumber, r.tenant, r.squareFeet, r.rentPerSF, r.monthlyRent, r.annualRent]),
    [],
    ['EXPENSES'],
    ['Category', 'Annual Amount'],
    ...dealData.expenses.map(e => [e.category, e.annualAmount]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(incExpData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Income & Expenses');

  // Scenarios
  if (scenarios.length > 0) {
    const headers = ['Metric', ...scenarios.map(s => s.name)];
    const rows = [
      headers,
      ['Purchase Price', ...scenarios.map(s => s.assumptions.purchasePrice)],
      ['Down Payment %', ...scenarios.map(s => s.assumptions.downPaymentPercent)],
      ['Interest Rate', ...scenarios.map(s => s.assumptions.interestRate)],
      ['Vacancy Rate', ...scenarios.map(s => s.assumptions.vacancyRate)],
      [],
      ['Cap Rate', ...scenarios.map(s => s.results.capRate / 100)],
      ['Cash on Cash', ...scenarios.map(s => s.results.cashOnCashReturn / 100)],
      ['DSCR', ...scenarios.map(s => s.results.dscr)],
      ['Annual Cash Flow', ...scenarios.map(s => s.results.annualCashFlow)],
      ['IRR', ...scenarios.map(s => s.results.irr / 100)],
      ['Equity Multiple', ...scenarios.map(s => s.results.equityMultiple)],
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws3, 'Scenarios');

    // Projections for first scenario
    if (scenarios[0]?.results.yearlyProjections.length > 0) {
      const projHeaders = ['Year', 'Gross Income', 'Vacancy', 'EGI', 'Expenses', 'NOI', 'Debt Service', 'Cash Flow', 'Cumulative CF', 'Property Value', 'Equity'];
      const projRows = [projHeaders, ...scenarios[0].results.yearlyProjections.map(p => [
        p.year, p.grossIncome, p.vacancyLoss, p.effectiveGrossIncome, p.operatingExpenses,
        p.noi, p.debtService, p.cashFlow, p.cumulativeCashFlow, p.propertyValue, p.equity,
      ])];
      const ws4 = XLSX.utils.aoa_to_sheet(projRows);
      XLSX.utils.book_append_sheet(wb, ws4, 'Projections');
    }
  }

  const fileName = `${dealData.property.name || 'Deal'}_Analysis.xlsx`;
  XLSX.writeFile(wb, fileName);
}
