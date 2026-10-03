/**
 * WorkWorld Vendor Discrepancy & Dispute Resolution System.
 * Pure TypeScript — no React imports.
 */

import type { Minor, InvoiceId, SupplierId, PoId } from "./types.ts";
import type { ThreeWayMatchResult } from "./matching.ts";

export interface DebitMemo {
  id: string;
  invoiceId: InvoiceId;
  supplierId: SupplierId;
  poId: PoId;
  atMinute: number;
  originalInvoiceAmountMinor: Minor;
  approvedRemittanceAmountMinor: Minor;
  debitMemoAmountMinor: Minor;
  reasonCode: "PRICE_OVERCHARGE" | "SHORT_DELIVERY" | "DEFECTIVE_GOODS" | "DUPLICATE_BILLING";
  description: string;
  formalNoticeLetter: string;
}

/**
 * Generates an attributable Debit Memo and formal dispute notification from 3-way match results.
 */
export function generateDebitMemo(
  match: ThreeWayMatchResult,
  supplierId: SupplierId,
  supplierName: string,
  atMinute: number
): DebitMemo {
  const debitAmount = match.varianceMinor;
  let reasonCode: DebitMemo["reasonCode"] = "PRICE_OVERCHARGE";

  if (match.status === "quantity_discrepancy") {
    reasonCode = "SHORT_DELIVERY";
  } else if (match.status === "price_discrepancy") {
    reasonCode = "PRICE_OVERCHARGE";
  } else if (match.status === "multi_variance") {
    reasonCode = "SHORT_DELIVERY";
  }

  const memoId = `DM-${match.invoiceId.replace(/^INV-?/, "")}`;
  const origAmountFormatted = (match.invoicedTotalMinor / 100).toFixed(2);
  const debitAmountFormatted = (debitAmount / 100).toFixed(2);
  const remitAmountFormatted = (match.recommendedAdjustedAmountMinor / 100).toFixed(2);

  const formalNoticeLetter = [
    `FORMAL NOTICE OF SHORT-PAYMENT & DEBIT MEMO: ${memoId}`,
    `TO: ${supplierName} (Accounts Receivable)`,
    `FROM: Northline Supply Co. (Accounts Payable)`,
    `DATE: Logical Minute ${atMinute}`,
    `RE: Invoice ${match.invoiceId} on Purchase Order ${match.poId}`,
    ``,
    `Please be advised that Invoice ${match.invoiceId} totaling $${origAmountFormatted} CAD has been reconciled against authorized Purchase Order ${match.poId} and verified warehouse receiving slips.`,
    ``,
    `DISCREPANCY FINDINGS:`,
    ...match.discrepancyReasons.map((r) => `  • ${r}`),
    ``,
    `ACTION TAKEN:`,
    `We have approved a short-payment remittance of $${remitAmountFormatted} CAD in full settlement of verifiable goods received.`,
    `Debit Memo ${memoId} in the amount of $${debitAmountFormatted} CAD has been applied to offset the unverified balance.`,
    ``,
    `Please update your ledger to reflect this settlement. Contact operations@northlinesupply.ca for any inquiries.`,
  ].join("\n");

  return {
    id: memoId,
    invoiceId: match.invoiceId,
    supplierId,
    poId: match.poId,
    atMinute,
    originalInvoiceAmountMinor: match.invoicedTotalMinor,
    approvedRemittanceAmountMinor: match.recommendedAdjustedAmountMinor,
    debitMemoAmountMinor: debitAmount,
    reasonCode,
    description: match.discrepancyReasons.join("; "),
    formalNoticeLetter,
  };
}
