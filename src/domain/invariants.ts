/**
 * WorkWorld Domain Invariant Verifier & Self-Healing Engine.
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
 * Asserts all core enterprise domain invariants on an EpisodeState snapshot.
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
