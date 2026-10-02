/**
 * Ledger: double-entry, integer minor units, reconstructible balances.
 * Every transaction must balance exactly (Σ debits == Σ credits).
 */
import type {
  AccountId,
  LedgerTxn,
  Minor,
  PurchaseOrder,
  Delivery,
} from "./types.ts";

export type Balances = Record<Exclude<AccountId, "opening_equity">, Minor>;

export function emptyBalances(): Balances {
  return {
    cash: 0,
    accounts_receivable: 0,
    inventory: 0,
    accounts_payable: 0,
  };
}

export function isBalanced(txn: LedgerTxn): boolean {
  let debits = 0;
  let credits = 0;
  for (const e of txn.entries) {
    if (!Number.isInteger(e.debitMinor) || !Number.isInteger(e.creditMinor)) return false;
    if (e.debitMinor < 0 || e.creditMinor < 0) return false;
    if (e.debitMinor > 0 && e.creditMinor > 0) return false; // one side only
    debits += e.debitMinor;
    credits += e.creditMinor;
  }
  return debits === credits && debits > 0;
}

export function applyTxn(balances: Balances, txn: LedgerTxn): Balances {
  const next: Balances = { ...balances };
  for (const e of txn.entries) {
    // Assets are debit-positive; liabilities (accounts payable) are credit-positive.
    const delta =
      e.account === "accounts_payable"
        ? e.creditMinor - e.debitMinor
        : e.debitMinor - e.creditMinor;
    next[e.account] = (next[e.account] ?? 0) + delta;
  }
  return next;
}

export function closingBalances(opening: Balances, txns: LedgerTxn[]): Balances {
  let b = { ...opening };
  for (const t of txns) b = applyTxn(b, t);
  return b;
}

/** Accounting equation check: assets == liabilities + equity (incl. earnings). */
export function equationHolds(balances: Balances, openingEquity: Minor): boolean {
  const assets = balances.cash + balances.accounts_receivable + balances.inventory;
  const liabilities = balances.accounts_payable;
  // Equity = opening equity + net income implied by asset/liability movement.
  const equity = openingEquity;
  return assets === liabilities + equity + impliedEarnings(balances);
}

/**
 * Earnings implied by movements that are not balance-sheet neutral:
 * inventory increases funded by AP are neutral; cash decreases without AP
 * decrease would be an expense (none in this domain); AP increases without
 * inventory increase would be an expense (none). For this domain the ledger
 * is closed under accrual + settlement, so implied earnings stay 0 and the
 * strict per-transaction balance is the binding invariant. Kept explicit so
 * future revenue episodes extend here instead of weakening checks.
 */
export function impliedEarnings(_balances: Balances): Minor {
  return 0;
}

/** Accrued AP for a PO = delivered quantity × PO unit price (checked-in only). */
export function deliveryAccrualMinor(po: PurchaseOrder, delivery: Delivery): Minor {
  let total = 0;
  for (const line of delivery.lines) {
    const poLine = po.lines.find(
      (l) => l.itemId === line.itemId || l.itemId === line.substituteFor,
    );
    if (!poLine) continue;
    total += line.qty * poLine.unitPriceMinor;
  }
  return total;
}

export function txnDelivers(txn: LedgerTxn, account: AccountId): Minor {
  return txn.entries
    .filter((e) => e.account === account)
    .reduce((sum, e) => sum + e.debitMinor - e.creditMinor, 0);
}

export function accrualTxn(id: string, atMinute: number, sourceId: string, amountMinor: Minor): LedgerTxn {
  return {
    id,
    atMinute,
    memo: `Goods received accrual ${sourceId}`,
    sourceType: "delivery_accrual",
    sourceId,
    entries: [
      { account: "inventory", debitMinor: amountMinor, creditMinor: 0 },
      { account: "accounts_payable", debitMinor: 0, creditMinor: amountMinor },
    ],
  };
}

export function settlementTxn(id: string, atMinute: number, sourceId: string, amountMinor: Minor): LedgerTxn {
  return {
    id,
    atMinute,
    memo: `Settlement ${sourceId}`,
    sourceType: "settlement",
    sourceId,
    entries: [
      { account: "accounts_payable", debitMinor: amountMinor, creditMinor: 0 },
      { account: "cash", debitMinor: 0, creditMinor: amountMinor },
    ],
  };
}
