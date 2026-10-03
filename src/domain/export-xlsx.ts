/**
 * Universal Data Interoperability & Financial Export Engine.
 * Exports double-entry ledger journals, spreadsheet grids, and invoice summaries
 * to RFC 4180 compliant CSV formats compatible with Microsoft Excel, Google Sheets,
 * and ERP import pipelines.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { EpisodeState, JournalEntry } from "./types.ts";
import { closingBalances } from "./ledger.ts";

export interface OperationsSnapshotState {
  inventory?: Record<string, number>;
  items?: EpisodeState["items"];
  ledger?: {
    cashMinor?: number;
    opening?: EpisodeState["ledger"]["opening"];
    txns?: EpisodeState["ledger"]["txns"];
  };
  policy: {
    budgetMinor?: number;
    approvalThresholdMinor?: number;
  };
}

/**
 * Escapes a cell value for safe RFC 4180 CSV export.
 * Neutralizes formula injection vulnerabilities (=, +, -, @) by prepending a quote.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // Formula injection defense for Excel
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports simulation ledger journal entries to standard double-entry accounting CSV.
 */
export function exportLedgerToCsv(txns: JournalEntry[]): string {
  const headers = ["Transaction ID", "Minute", "Description", "Account", "Debit ($)", "Credit ($)", "Balanced"];
  const rows: string[] = [headers.join(",")];

  for (const txn of txns) {
    const isBalanced = txn.debits === txn.credits;
    const desc = escapeCsvCell(txn.memo);
    const minute = txn.minute;
    const id = escapeCsvCell(txn.id);

    // Format debits line
    rows.push([
      id,
      minute,
      desc,
      escapeCsvCell(txn.debitAccount),
      (txn.debits / 100).toFixed(2),
      "0.00",
      isBalanced ? "TRUE" : "FALSE",
    ].join(","));

    // Format credits line
    rows.push([
      id,
      minute,
      desc,
      escapeCsvCell(txn.creditAccount),
      "0.00",
      (txn.credits / 100).toFixed(2),
      isBalanced ? "TRUE" : "FALSE",
    ].join(","));
  }

  return rows.join("\r\n");
}

/**
 * Exports a spreadsheet workbook grid to CSV.
 */
export function exportWorkbookGridToCsv(cells: Record<string, { value: unknown; formula?: string }>): string {
  // Determine bounding box
  const cellKeys = Object.keys(cells);
  if (cellKeys.length === 0) return "";

  let maxRow = 1;
  let maxColCode = "A".charCodeAt(0);

  for (const key of cellKeys) {
    const match = key.match(/^([A-Z]+)(\d+)$/i);
    if (match) {
      const col = match[1]!.toUpperCase();
      const row = parseInt(match[2]!, 10);
      if (row > maxRow) maxRow = row;
      const colCode = col.charCodeAt(0);
      if (colCode > maxColCode) maxColCode = colCode;
    }
  }

  const rows: string[] = [];
  for (let r = 1; r <= maxRow; r++) {
    const rowCells: string[] = [];
    for (let c = "A".charCodeAt(0); c <= maxColCode; c++) {
      const coord = `${String.fromCharCode(c)}${r}`;
      const cell = cells[coord];
      const val = cell?.formula ? cell.formula : (cell?.value ?? "");
      rowCells.push(escapeCsvCell(val));
    }
    rows.push(rowCells.join(","));
  }

  return rows.join("\r\n");
}

/**
 * Generates an executive summary of inventory and open purchase orders.
 */
export function exportOperationsSnapshotCsv(state: EpisodeState | OperationsSnapshotState): string {
  const lines: string[] = ["=== INVENTORY POSITION ===", "Item ID,Quantity On Hand"];
  const inv = "inventory" in state && state.inventory ? state.inventory : {};
  if (Object.keys(inv).length > 0) {
    for (const [item, qty] of Object.entries(inv)) {
      lines.push(`${escapeCsvCell(item)},${qty}`);
    }
  } else if ("items" in state && state.items) {
    for (const [id, item] of Object.entries(state.items)) {
      lines.push(`${escapeCsvCell(id)},${escapeCsvCell(item.name)}`);
    }
  }

  lines.push("", "=== CASH & BUDGET ===");
  let cashMinor = 0;
  const ledger = state.ledger as
    | { cashMinor?: number; opening?: EpisodeState["ledger"]["opening"]; txns?: EpisodeState["ledger"]["txns"] }
    | undefined;
  if (typeof ledger?.cashMinor === "number") {
    cashMinor = ledger.cashMinor;
  } else if (ledger?.opening && ledger?.txns) {
    cashMinor = closingBalances(ledger.opening, ledger.txns).cash;
  }

  lines.push(`Available Cash,$${(cashMinor / 100).toFixed(2)}`);
  lines.push(`Budget Limit,$${(((state.policy?.budgetMinor) ?? 0) / 100).toFixed(2)}`);
  lines.push(`Approval Threshold,$${(((state.policy?.approvalThresholdMinor) ?? 0) / 100).toFixed(2)}`);

  return lines.join("\r\n");
}
