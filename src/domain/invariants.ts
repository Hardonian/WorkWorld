/**
 * WorkWorld domain invariant verifier. Reports violations; it never mutates or
 * silently "repairs" state.
 * Pure TypeScript — no React imports.
 */

import type { EpisodeState, Minor } from "./types.ts";
import { closingBalances } from "./ledger.ts";

export interface InvariantViolation {
  code:
    | "ACCOUNTING_EQUATION_IMBALANCE"
    | "NEGATIVE_INVENTORY_BALANCE"
    | "NEGATIVE_CASH_BALANCE"
    | "DUPLICATE_SETTLEMENT"
    | "DANGLING_DOCUMENT_REFERENCE"
    | "BUDGET_CAP_EXCEEDED";
  severity: "FATAL" | "WARNING";
  description: string;
  expected: string;
  actual: string;
  remediationAdvice: string;
}

export interface InvariantVerificationReport {
  passed: boolean;
  checkedAtMinute: number;
  revision: number;
  violations: InvariantViolation[];
  metrics: {
    totalAssetsMinor: Minor;
    totalLiabilitiesMinor: Minor;
  };
}

/**
 * Checks cross-document and ledger invariants on an EpisodeState snapshot.
 */
export function verifyDomainInvariants(state: EpisodeState): InvariantVerificationReport {
  const violations: InvariantViolation[] = [];
  const { ledger, clockMinute, revision, invoices, deliveries, purchaseOrders } = state;

  const currentBalances = closingBalances(ledger.opening, ledger.txns);

  // 1. Double-Entry Assets vs Liabilities check
  const totalAssets =
    (currentBalances.cash ?? 0) +
    (currentBalances.accounts_receivable ?? 0) +
    (currentBalances.inventory ?? 0);
  const totalLiabilities = currentBalances.accounts_payable ?? 0;
  const openingEquity =
    ledger.opening.cash +
    ledger.opening.accounts_receivable +
    ledger.opening.inventory -
    ledger.opening.accounts_payable;
  if (totalAssets !== totalLiabilities + openingEquity) {
    violations.push({
      code: "ACCOUNTING_EQUATION_IMBALANCE",
      severity: "FATAL",
      description: "Closing ledger balances do not satisfy the accounting equation.",
      expected: `assets = liabilities + opening equity (${totalLiabilities + openingEquity})`,
      actual: `assets are ${totalAssets}`,
      remediationAdvice: "Replay the append-only action log and inspect the first unbalanced ledger transaction.",
    });
  }

  // 2. Inventory non-negativity
  if ((currentBalances.inventory ?? 0) < 0) {
    violations.push({
      code: "NEGATIVE_INVENTORY_BALANCE",
      severity: "FATAL",
      description: "Inventory valuation in ledger cannot be negative.",
      expected: "inventory >= 0",
      actual: `inventory is ${currentBalances.inventory}`,
      remediationAdvice: "Reverse invalid credit adjustment or re-check receipt accruals.",
    });
  }

  // 3. Cash balance warning if overdraft
  if ((currentBalances.cash ?? 0) < 0) {
    violations.push({
      code: "NEGATIVE_CASH_BALANCE",
      severity: "WARNING",
      description: "Operating cash account is in overdraft.",
      expected: "cash >= 0",
      actual: `cash is ${currentBalances.cash}`,
      remediationAdvice: "Secure short-term credit line or delay non-critical supplier disbursements.",
    });
  }

  // 4. Duplicate invoice settlement check
  const invoiceList = Object.values(invoices ?? {});
  const settledInvoices = invoiceList.filter((i) => i.status === "paid");
  const seenTxnIds = new Set<string>();
  for (const inv of settledInvoices) {
    if (inv.settlementTxnIds.length > 1) {
      violations.push({
        code: "DUPLICATE_SETTLEMENT",
        severity: "FATAL",
        description: `Invoice ${inv.id} has more than one settlement transaction.`,
        expected: "At most one settlement per invoice.",
        actual: `${inv.settlementTxnIds.length} settlement transactions.`,
        remediationAdvice: "Reverse the duplicate settlement and preserve the original evidence record.",
      });
    }
    for (const txnId of inv.settlementTxnIds) {
      if (seenTxnIds.has(txnId)) {
        violations.push({
          code: "DUPLICATE_SETTLEMENT",
          severity: "FATAL",
          description: `Duplicate settlement transaction reference detected: ${txnId}`,
          expected: "Each settlement transaction must settle at most one unique invoice.",
          actual: `Transaction ${txnId} linked to multiple settlement records.`,
          remediationAdvice: "Cancel the duplicate disbursement and void duplicate ledger entry.",
        });
      }
      seenTxnIds.add(txnId);
    }
  }

  for (const inv of invoiceList) {
    if (inv.poId && !purchaseOrders[inv.poId]) {
      violations.push({
        code: "DANGLING_DOCUMENT_REFERENCE",
        severity: "FATAL",
        description: `Invoice ${inv.id} references missing purchase order ${inv.poId}.`,
        expected: "Invoice purchase-order references resolve.",
        actual: `PO ${inv.poId} not found.`,
        remediationAdvice: "Restore the source purchase order or correct the invoice reference through an audited action.",
      });
    }
    if (inv.deliveryId && !deliveries[inv.deliveryId]) {
      violations.push({
        code: "DANGLING_DOCUMENT_REFERENCE",
        severity: "FATAL",
        description: `Invoice ${inv.id} references missing delivery ${inv.deliveryId}.`,
        expected: "Invoice delivery references resolve.",
        actual: `Delivery ${inv.deliveryId} not found.`,
        remediationAdvice: "Restore the goods receipt or correct the invoice reference through an audited action.",
      });
    }
  }

  if (state.budget.committedMinor > state.policy.budgetMinor) {
    violations.push({
      code: "BUDGET_CAP_EXCEEDED",
      severity: "FATAL",
      description: "Committed purchase-order spend exceeds the episode budget.",
      expected: `committed <= ${state.policy.budgetMinor}`,
      actual: `committed is ${state.budget.committedMinor}`,
      remediationAdvice: "Cancel or amend unauthorized commitments and replay the ledger from verified evidence.",
    });
  }

  // 5. Dangling document references
  const deliveryList = Object.values(deliveries ?? {});
  for (const del of deliveryList) {
    if (!purchaseOrders[del.poId]) {
      violations.push({
        code: "DANGLING_DOCUMENT_REFERENCE",
        severity: "FATAL",
        description: `Delivery ${del.id} references non-existent Purchase Order ${del.poId}`,
        expected: "All deliveries must link to a valid PO in state.",
        actual: `PO ${del.poId} not found in state.purchaseOrders.`,
        remediationAdvice: "Restore missing purchase order or prune orphan delivery record.",
      });
    }
  }

  const fatalViolations = violations.filter((v) => v.severity === "FATAL");

  return {
    passed: fatalViolations.length === 0,
    checkedAtMinute: clockMinute,
    revision,
    violations,
    metrics: {
      totalAssetsMinor: totalAssets,
      totalLiabilitiesMinor: totalLiabilities,
    },
  };
}
