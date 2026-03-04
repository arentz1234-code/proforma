export interface RentRollEntry {
  unitNumber: string;
  tenant: string;
  squareFeet: number;
  rentPerSF: number;
  monthlyRent: number;
  annualRent: number;
  leaseStart?: string;
  leaseEnd?: string;
  leaseType?: string;
}

export interface ExpenseLineItem {
  category: string;
  annualAmount: number;
  perUnit?: number;
  perSF?: number;
}

export interface LoanTerms {
  loanAmount: number;
  interestRate: number;
  termYears: number;
  amortizationYears: number;
  loanType: string;
  isInterestOnly: boolean;
}

export interface PropertyInfo {
  name: string;
  address: string;
  propertyType: string;
  yearBuilt?: number;
  totalUnits?: number;
  totalSF: number;
  lotSize?: number;
  occupancyRate?: number;
}

export interface DealData {
  property: PropertyInfo;
  askingPrice: number;
  pricePerUnit?: number;
  pricePerSF: number;
  rentRoll: RentRollEntry[];
  grossPotentialRent: number;
  vacancyRate: number;
  vacancyLoss: number;
  otherIncome: number;
  effectiveGrossIncome: number;
  expenses: ExpenseLineItem[];
  totalExpenses: number;
  expenseRatio: number;
  managementFee: number;
  replacementReserves: number;
  netOperatingIncome: number;
  loanTerms: LoanTerms;
  downPaymentPercent: number;
  rawText?: string;
}

export interface ScenarioAssumptions {
  purchasePrice: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTermYears: number;
  amortizationYears: number;
  vacancyRate: number;
  rentGrowthRate: number;
  expenseGrowthRate: number;
  holdPeriodYears: number;
  exitCapRate: number;
  closingCostPercent: number;
  sellingCostPercent: number;
}

export interface ScenarioResults {
  downPayment: number;
  loanAmount: number;
  monthlyPayment: number;
  annualDebtService: number;
  capRate: number;
  cashOnCashReturn: number;
  dscr: number;
  debtYield: number;
  annualCashFlow: number;
  monthlyCashFlow: number;
  pricePerUnit?: number;
  pricePerSF: number;
  noiPerUnit?: number;
  noiPerSF: number;
  yearlyProjections: YearlyProjection[];
  exitValue: number;
  totalProfit: number;
  equityMultiple: number;
  irr: number;
}

export interface YearlyProjection {
  year: number;
  grossIncome: number;
  vacancyLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  cumulativeCashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
}

export interface Scenario {
  id: string;
  name: string;
  assumptions: ScenarioAssumptions;
  results: ScenarioResults;
}

export interface ReverseResult {
  requiredPurchasePrice: number;
  requiredRentPerSF: number;
  maxVacancyRate: number;
  requiredExitCapRate: number;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}
