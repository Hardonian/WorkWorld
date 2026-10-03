/**
 * Recurring Amortization and Expense Accruals Engine (Pillar 2, Item 017).
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface PrepaidContract {
  id: string; // e.g. "PRE-INS-2026", "PRE-SaaS-101"
  description: string;
  totalCostMinor: number;
  startDateDay: number;
  durationDays: number;
  expenseAccount: "insurance_expense" | "software_expense" | "rent_expense" | "operating_expense";
  accumulatedAmortizationMinor: number;
}

export interface AccrualJournalEntry {
  day: number;
  contractId: string;
  debitAccount: string;
  creditAccount: "prepaid_expenses";
  amountMinor: number;
  memo: string;
}

/**
 * Calculates straight-line daily amortization and generates adjusting journal entries for elapsed periods.
 */
export function amortizePrepaidContracts(
  contracts: PrepaidContract[],
  asOfDay: number
): {
  updatedContracts: PrepaidContract[];
  adjustingEntries: AccrualJournalEntry[];
  totalAmortizedMinor: number;
} {
  const updatedContracts: PrepaidContract[] = [];
  const adjustingEntries: AccrualJournalEntry[] = [];
  let totalAmortizedMinor = 0;

  for (const c of contracts) {
    if (asOfDay <= c.startDateDay) {
      updatedContracts.push({ ...c });
      continue;
    }

    const elapsedDays = Math.min(c.durationDays, asOfDay - c.startDateDay);
    const expectedCumulativeAmortization = Math.round((c.totalCostMinor * elapsedDays) / c.durationDays);
    const unpostedAmortization = Math.max(0, expectedCumulativeAmortization - c.accumulatedAmortizationMinor);

    if (unpostedAmortization > 0) {
      adjustingEntries.push({
        day: asOfDay,
        contractId: c.id,
        debitAccount: c.expenseAccount,
        creditAccount: "prepaid_expenses",
        amountMinor: unpostedAmortization,
        memo: `Amortization accrual for ${c.description} (Day ${c.startDateDay + 1} to ${asOfDay})`,
      });
      totalAmortizedMinor += unpostedAmortization;
    }

    updatedContracts.push({
      ...c,
      accumulatedAmortizationMinor: c.accumulatedAmortizationMinor + unpostedAmortization,
    });
  }

  return { updatedContracts, adjustingEntries, totalAmortizedMinor };
}

/**
 * Computes remaining unamortized asset balance across all prepaid contracts.
 */
export function calculatePrepaidAssetBalance(contracts: PrepaidContract[]): {
  totalOriginalCostMinor: number;
  totalAccumulatedAmortizationMinor: number;
  netPrepaidAssetMinor: number;
} {
  let totalOriginalCostMinor = 0;
  let totalAccumulatedAmortizationMinor = 0;

  for (const c of contracts) {
    totalOriginalCostMinor += c.totalCostMinor;
    totalAccumulatedAmortizationMinor += c.accumulatedAmortizationMinor;
  }

  return {
    totalOriginalCostMinor,
    totalAccumulatedAmortizationMinor,
    netPrepaidAssetMinor: totalOriginalCostMinor - totalAccumulatedAmortizationMinor,
  };
}
