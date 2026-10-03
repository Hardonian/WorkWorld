/**
 * State Diffing Engine.
 * Computes deep, semantic operational differences between two episode states
 * (e.g. initial state vs current state, or consecutive revisions) for assessor
 * review, audit logs, and AI evaluation visualizers.
 */
import type { EpisodeState, PurchaseOrder, Delivery, Invoice, Ticket } from "./types.ts";
import { closingBalances } from "./ledger.ts";

export interface FieldChange<T = unknown> {
  field: string;
  before: T;
  after: T;
}

export interface EntityDiff<T = unknown> {
  id: string;
  kind: "po" | "delivery" | "invoice" | "ticket" | "sheet";
  type: "created" | "modified" | "deleted";
  before?: T;
  after?: T;
  changes: FieldChange[];
}

export interface LedgerFinancialDiff {
  cashChangeMinor: number;
  arChangeMinor: number;
  apChangeMinor: number;
  inventoryChangeMinor: number;
  netEquityChangeMinor: number;
  totalTransactionsAdded: number;
}

export interface StateDiff {
  runId: string;
  fromRevision: number;
  toRevision: number;
  fromMinute: number;
  toMinute: number;
  elapsedMinutes: number;
  purchaseOrders: EntityDiff<PurchaseOrder>[];
  deliveries: EntityDiff<Delivery>[];
  invoices: EntityDiff<Invoice>[];
  tickets: EntityDiff<Ticket>[];
  financials: LedgerFinancialDiff;
  summary: {
    totalEntitiesModified: number;
    newOrdersCount: number;
    completedDeliveriesCount: number;
    settledInvoicesCount: number;
    resolvedTicketsCount: number;
  };
}

/**
 * Compare two purchase orders for specific field changes.
 */
function diffPo(before: PurchaseOrder | undefined, after: PurchaseOrder | undefined): EntityDiff<PurchaseOrder> | null {
  if (!before && after) {
    return {
      id: after.id,
      kind: "po",
      type: "created",
      after,
      changes: [{ field: "status", before: undefined, after: after.status }],
    };
  }
  if (before && !after) {
    return {
      id: before.id,
      kind: "po",
      type: "deleted",
      before,
      changes: [],
    };
  }
  if (!before || !after) return null;

  const changes: FieldChange[] = [];
  if (before.status !== after.status) {
    changes.push({ field: "status", before: before.status, after: after.status });
  }
  if (before.budgetCommittedMinor !== after.budgetCommittedMinor) {
    changes.push({ field: "budgetCommittedMinor", before: before.budgetCommittedMinor, after: after.budgetCommittedMinor });
  }
  if (before.lines.length !== after.lines.length) {
    changes.push({ field: "linesCount", before: before.lines.length, after: after.lines.length });
  }

  if (changes.length === 0) return null;
  return { id: after.id, kind: "po", type: "modified", before, after, changes };
}

/**
 * Compare two tickets for status, notes, or commitment changes.
 */
function diffTicket(before: Ticket | undefined, after: Ticket | undefined): EntityDiff<Ticket> | null {
  if (!before && after) {
    return { id: after.id, kind: "ticket", type: "created", after, changes: [] };
  }
  if (!before || !after) return null;

  const changes: FieldChange[] = [];
  if (before.status !== after.status) {
    changes.push({ field: "status", before: before.status, after: after.status });
  }
  const beforePromisedDay = before.commitments[0]?.promisedDay;
  const afterPromisedDay = after.commitments[0]?.promisedDay;
  if (beforePromisedDay !== afterPromisedDay) {
    changes.push({ field: "promisedDay", before: beforePromisedDay, after: afterPromisedDay });
  }
  if (before.notes.length !== after.notes.length) {
    changes.push({ field: "notesCount", before: before.notes.length, after: after.notes.length });
  }

  if (changes.length === 0) return null;
  return { id: after.id, kind: "ticket", type: "modified", before, after, changes };
}

/**
 * Compute the complete semantic diff between two EpisodeStates.
 */
export function computeStateDiff(initial: EpisodeState, current: EpisodeState): StateDiff {
  // 1. Purchase Orders
  const poDiffs: EntityDiff<PurchaseOrder>[] = [];
  const allPoIds = Array.from(new Set([...Object.keys(initial.purchaseOrders), ...Object.keys(current.purchaseOrders)]));
  for (const id of allPoIds) {
    const d = diffPo(initial.purchaseOrders[id], current.purchaseOrders[id]);
    if (d) poDiffs.push(d);
  }

  // 2. Deliveries
  const deliveryDiffs: EntityDiff<Delivery>[] = [];
  const allDelivIds = Array.from(new Set([...Object.keys(initial.deliveries), ...Object.keys(current.deliveries)]));
  for (const id of allDelivIds) {
    const before = initial.deliveries[id];
    const after = current.deliveries[id];
    if (!before && after) {
      deliveryDiffs.push({ id, kind: "delivery", type: "created", after, changes: [] });
    } else if (before && after && before.status !== after.status) {
      deliveryDiffs.push({
        id,
        kind: "delivery",
        type: "modified",
        before,
        after,
        changes: [{ field: "status", before: before.status, after: after.status }],
      });
    }
  }

  // 3. Invoices
  const invoiceDiffs: EntityDiff<Invoice>[] = [];
  const allInvIds = Array.from(new Set([...Object.keys(initial.invoices), ...Object.keys(current.invoices)]));
  for (const id of allInvIds) {
    const before = initial.invoices[id];
    const after = current.invoices[id];
    if (!before && after) {
      invoiceDiffs.push({ id, kind: "invoice", type: "created", after, changes: [] });
    } else if (before && after && before.status !== after.status) {
      invoiceDiffs.push({
        id,
        kind: "invoice",
        type: "modified",
        before,
        after,
        changes: [{ field: "status", before: before.status, after: after.status }],
      });
    }
  }

  // 4. Tickets
  const ticketDiffs: EntityDiff<Ticket>[] = [];
  const allTicketIds = Array.from(new Set([...Object.keys(initial.tickets), ...Object.keys(current.tickets)]));
  for (const id of allTicketIds) {
    const d = diffTicket(initial.tickets[id], current.tickets[id]);
    if (d) ticketDiffs.push(d);
  }

  // 5. Financial Ledger
  const beforeBalances = closingBalances(initial.ledger.opening, initial.ledger.txns);
  const afterBalances = closingBalances(current.ledger.opening, current.ledger.txns);

  const initialEquity = beforeBalances.cash + beforeBalances.accounts_receivable + beforeBalances.inventory - beforeBalances.accounts_payable;
  const currentEquity = afterBalances.cash + afterBalances.accounts_receivable + afterBalances.inventory - afterBalances.accounts_payable;

  const financials: LedgerFinancialDiff = {
    cashChangeMinor: afterBalances.cash - beforeBalances.cash,
    arChangeMinor: afterBalances.accounts_receivable - beforeBalances.accounts_receivable,
    apChangeMinor: afterBalances.accounts_payable - beforeBalances.accounts_payable,
    inventoryChangeMinor: afterBalances.inventory - beforeBalances.inventory,
    netEquityChangeMinor: currentEquity - initialEquity,
    totalTransactionsAdded: current.ledger.txns.length - initial.ledger.txns.length,
  };

  const newOrdersCount = poDiffs.filter((p) => p.type === "created").length;
  const completedDeliveriesCount = deliveryDiffs.filter((d) => d.after?.status === "checked_in").length;
  const settledInvoicesCount = invoiceDiffs.filter((i) => i.after?.status === "paid").length;
  const resolvedTicketsCount = ticketDiffs.filter((t) => t.after?.status === "resolved").length;

  return {
    runId: current.runId,
    fromRevision: initial.revision,
    toRevision: current.revision,
    fromMinute: initial.clockMinute,
    toMinute: current.clockMinute,
    elapsedMinutes: current.clockMinute - initial.clockMinute,
    purchaseOrders: poDiffs,
    deliveries: deliveryDiffs,
    invoices: invoiceDiffs,
    tickets: ticketDiffs,
    financials,
    summary: {
      totalEntitiesModified: poDiffs.length + deliveryDiffs.length + invoiceDiffs.length + ticketDiffs.length,
      newOrdersCount,
      completedDeliveriesCount,
      settledInvoicesCount,
      resolvedTicketsCount,
    },
  };
}
