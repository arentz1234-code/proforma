import { ScenarioAssumptions, ScenarioResults, YearlyProjection, AmortizationRow } from '@/types';

export function calcMonthlyPayment(principal: number, annualRate: number, amortYears: number): number {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal / n;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function calcAnnualDebtService(principal: number, annualRate: number, amortYears: number): number {
  return calcMonthlyPayment(principal, annualRate, amortYears) * 12;
}

export function calcLoanBalanceAtMonth(principal: number, annualRate: number, amortYears: number, month: number): number {
  const r = annualRate / 100 / 12;
  const n = amortYears * 12;
  if (r === 0) return principal - (principal / n) * month;
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, month)) / (Math.pow(1 + r, n) - 1);
}

export function calcAmortizationSchedule(principal: number, annualRate: number, amortYears: number): AmortizationRow[] {
  const rows: AmortizationRow[] = [];
  const r = annualRate / 100 / 12;
  const pmt = calcMonthlyPayment(principal, annualRate, amortYears);
  let balance = principal;
  const n = amortYears * 12;
  for (let m = 1; m <= n && m <= 360; m++) {
    const interest = balance * r;
    const principalPart = pmt - interest;
    balance -= principalPart;
    rows.push({ month: m, payment: pmt, principal: principalPart, interest, balance: Math.max(0, balance) });
  }
  return rows;
}

export function calcCapRate(noi: number, price: number): number {
  return price > 0 ? (noi / price) * 100 : 0;
}

export function calcCashOnCash(annualCF: number, totalCashInvested: number): number {
  return totalCashInvested > 0 ? (annualCF / totalCashInvested) * 100 : 0;
}

export function calcDSCR(noi: number, annualDS: number): number {
  return annualDS > 0 ? noi / annualDS : 0;
}

export function calcDebtYield(noi: number, loanAmount: number): number {
  return loanAmount > 0 ? (noi / loanAmount) * 100 : 0;
}

export function calcBreakEvenOccupancy(opEx: number, ds: number, gpr: number): number {
  return gpr > 0 ? ((opEx + ds) / gpr) * 100 : 0;
}

export function calcIRR(cashFlows: number[]): number {
  let rate = 0.1;
  for (let i = 0; i < 1000; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < 0.00001) { rate = newRate; break; }
    rate = newRate;
    if (rate < -0.99 || rate > 10) { rate = 0; break; }
  }
  return rate * 100;
}

export function calcYearlyProjections(
  assumptions: ScenarioAssumptions,
  baseGPR: number,
  baseExpenses: number,
  otherIncome: number,
): YearlyProjection[] {
  const projections: YearlyProjection[] = [];
  const dp = assumptions.purchasePrice * (assumptions.downPaymentPercent / 100);
  const loan = assumptions.purchasePrice - dp;
  const annualDS = calcAnnualDebtService(loan, assumptions.interestRate, assumptions.amortizationYears);
  let cumCF = 0;

  for (let year = 1; year <= assumptions.holdPeriodYears; year++) {
    const rentGrowth = Math.pow(1 + assumptions.rentGrowthRate / 100, year - 1);
    const expGrowth = Math.pow(1 + assumptions.expenseGrowthRate / 100, year - 1);
    const gi = baseGPR * rentGrowth;
    const vl = gi * (assumptions.vacancyRate / 100);
    const egi = gi - vl + (otherIncome * rentGrowth);
    const opEx = baseExpenses * expGrowth;
    const noi = egi - opEx;
    const cf = noi - annualDS;
    cumCF += cf;
    const monthsElapsed = year * 12;
    const loanBal = calcLoanBalanceAtMonth(loan, assumptions.interestRate, assumptions.amortizationYears, monthsElapsed);
    const propValue = assumptions.exitCapRate > 0 ? noi / (assumptions.exitCapRate / 100) : 0;

    projections.push({
      year, grossIncome: gi, vacancyLoss: vl, effectiveGrossIncome: egi,
      operatingExpenses: opEx, noi, debtService: annualDS, cashFlow: cf,
      cumulativeCashFlow: cumCF, propertyValue: propValue, loanBalance: loanBal,
      equity: propValue - loanBal,
    });
  }
  return projections;
}

export function calcScenarioResults(
  assumptions: ScenarioAssumptions,
  baseGPR: number,
  baseExpenses: number,
  otherIncome: number,
  totalUnits?: number,
  totalSF?: number,
): ScenarioResults {
  const dp = assumptions.purchasePrice * (assumptions.downPaymentPercent / 100);
  const closingCosts = assumptions.purchasePrice * (assumptions.closingCostPercent / 100);
  const totalCashInvested = dp + closingCosts;
  const loan = assumptions.purchasePrice - dp;
  const monthly = calcMonthlyPayment(loan, assumptions.interestRate, assumptions.amortizationYears);
  const annualDS = monthly * 12;
  const vacLoss = baseGPR * (assumptions.vacancyRate / 100);
  const egi = baseGPR - vacLoss + otherIncome;
  const noi = egi - baseExpenses;
  const cf = noi - annualDS;

  const projections = calcYearlyProjections(assumptions, baseGPR, baseExpenses, otherIncome);
  const lastYear = projections[projections.length - 1];
  const exitVal = lastYear ? lastYear.propertyValue : 0;
  const loanBalAtExit = lastYear ? lastYear.loanBalance : loan;
  const netSaleProceeds = exitVal * (1 - assumptions.sellingCostPercent / 100) - loanBalAtExit;
  const totalProfit = netSaleProceeds - totalCashInvested + (lastYear?.cumulativeCashFlow || 0);
  const totalReturns = totalCashInvested + totalProfit;

  const irrFlows: number[] = [-totalCashInvested];
  projections.forEach((p, i) => {
    let flow = p.cashFlow;
    if (i === projections.length - 1) {
      flow += exitVal * (1 - assumptions.sellingCostPercent / 100) - loanBalAtExit;
    }
    irrFlows.push(flow);
  });

  return {
    downPayment: dp, loanAmount: loan, monthlyPayment: monthly, annualDebtService: annualDS,
    capRate: calcCapRate(noi, assumptions.purchasePrice),
    cashOnCashReturn: calcCashOnCash(cf, totalCashInvested),
    dscr: calcDSCR(noi, annualDS),
    debtYield: calcDebtYield(noi, loan),
    annualCashFlow: cf, monthlyCashFlow: cf / 12,
    pricePerUnit: totalUnits ? assumptions.purchasePrice / totalUnits : undefined,
    pricePerSF: totalSF ? assumptions.purchasePrice / totalSF : 0,
    noiPerUnit: totalUnits ? noi / totalUnits : undefined,
    noiPerSF: totalSF ? noi / totalSF : 0,
    yearlyProjections: projections,
    exitValue: exitVal, totalProfit,
    equityMultiple: totalCashInvested > 0 ? totalReturns / totalCashInvested : 0,
    irr: calcIRR(irrFlows),
  };
}

// Reverse analysis functions
export function requiredPriceForCoC(
  noi: number, targetCoC: number, dpPercent: number,
  rate: number, amortYears: number, closingCostPercent: number,
): number {
  let low = 0, high = noi * 50;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const dp = mid * (dpPercent / 100);
    const closing = mid * (closingCostPercent / 100);
    const loan = mid - dp;
    const ds = calcAnnualDebtService(loan, rate, amortYears);
    const cf = noi - ds;
    const coc = (dp + closing) > 0 ? (cf / (dp + closing)) * 100 : 0;
    if (coc > targetCoC) low = mid; else high = mid;
  }
  return Math.round((low + high) / 2);
}

export function requiredRentForCapRate(
  targetCap: number, price: number, totalExpenses: number,
  vacancyRate: number, otherIncome: number, totalSF: number,
): number {
  const requiredNOI = price * (targetCap / 100);
  const requiredEGI = requiredNOI + totalExpenses;
  const requiredGPR = (requiredEGI - otherIncome) / (1 - vacancyRate / 100);
  return totalSF > 0 ? requiredGPR / totalSF : 0;
}

export function maxVacancyForDSCR(
  targetDSCR: number, annualDS: number, gpr: number,
  totalExpenses: number, otherIncome: number,
): number {
  const requiredNOI = annualDS * targetDSCR;
  const requiredEGI = requiredNOI + totalExpenses;
  const requiredGrossRent = requiredEGI - otherIncome;
  if (gpr <= 0) return 0;
  return Math.max(0, (1 - requiredGrossRent / gpr) * 100);
}
