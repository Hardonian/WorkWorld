/**
 * Pure state transitions: typed actions -> validated effects, and scheduled
 * logical-time events. Every action is validated against permissions, state and
 * policy BEFORE any state change. Rejections are recorded as evidence.
 */
import { createHash } from "node:crypto";
import type {
  Action,
  ActionError,
  Actor,
  Delivery,
  DeliveryLine,
  EpisodeState,
  Invoice,
  LedgerTxn,
  Message,
  PoLine,
  PurchaseOrder,
  ScheduledEvent,
  Ticket,
  Transition,
  Workbook,
  WorkNote,
} from "./types.ts";
import { MAX_QTY, MAX_MONEY_MINOR } from "./types.ts";
import { accrualTxn, deliveryAccrualMinor, settlementTxn } from "./ledger.ts";
import { evaluateFormula, setCell } from "./artifacts.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";

export function payloadDigest(action: Action): string {
  const { actionId: _a, idempotencyKey: _k, expectedRevision: _r, ...payload } = action;
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function err(code: ActionError["code"], message: string): ActionError {
  return { code, message };
}

function poTotalMinor(lines: PoLine[]): number {
  return lines.reduce((s, l) => s + l.qty * l.unitPriceMinor, 0);
}

function validatePoLines(
  state: EpisodeState,
  supplierId: string,
  lines: PoLine[],
): ActionError[] {
  const errors: ActionError[] = [];
  const supplier = state.suppliers[supplierId];
  if (!supplier) {
    errors.push(err("POLICY_REF_MISSING", `unknown supplier ${supplierId}`));
    return errors;
  }
  if (lines.length === 0 || lines.length > 50) {
    errors.push(err("PAYLOAD_INVALID", "lines must contain 1..50 entries"));
    return errors;
  }
  for (const line of lines) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY) {
      errors.push(err("POLICY_QTY_INVALID", `invalid qty for ${line.itemId}`));
      continue;
    }
    const entry = supplier.catalog.find((c) => c.itemId === line.itemId);
    if (!entry) {
      errors.push(err("POLICY_REF_MISSING", `supplier does not stock ${line.itemId}`));
      continue;
    }
    if (line.unitPriceMinor !== entry.unitPriceMinor) {
      errors.push(
        err(
          "POLICY_QTY_INVALID",
          `unit price for ${line.itemId} must equal catalog price ${entry.unitPriceMinor}`,
        ),
      );
    }
  }
  return errors;
}

function sortedLines(lines: DeliveryLine[]): string {
  return JSON.stringify(
    [...lines]
      .map((l) => ({ itemId: l.itemId, qty: l.qty, substituteFor: l.substituteFor ?? null }))
      .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0)),
  );
}

const TICKET_ORDER = ["open", "in_progress", "waiting", "resolved", "closed"] as const;

type HandlerResult = { errors: ActionError[]; effects: string[] };

function handleAction(
  state: EpisodeState,
  action: Action,
  actor: Actor,
): HandlerResult {
  const errors: ActionError[] = [];
  const effects: string[] = [];
  const day = Math.floor(state.clockMinute / 1440);

  switch (action.type) {
    case "advance_time": {
      if (!Number.isInteger(action.minutes) || action.minutes < 1 || action.minutes > 20160) {
        errors.push(err("PAYLOAD_INVALID", "minutes must be 1..20160"));
        break;
      }
      effects.push(`clock advanced ${action.minutes}m`);
      break;
    }

    case "draft_purchase_order": {
      if (state.purchaseOrders[action.poId]) {
        errors.push(err("PAYLOAD_INVALID", `poId ${action.poId} already exists`));
        break;
      }
      errors.push(...validatePoLines(state, action.supplierId, action.lines));
      if (!Number.isInteger(action.requestedDeliveryDay) || action.requestedDeliveryDay < day) {
        errors.push(err("POLICY_TEMPORAL_INVALID", "requested delivery day cannot be in the past"));
      }
      if (action.note.length > 2000) errors.push(err("PAYLOAD_INVALID", "note too long"));
      if (errors.length) break;
      const total = poTotalMinor(action.lines);
      if (total <= 0 || total > MAX_MONEY_MINOR) {
        errors.push(err("PAYLOAD_INVALID", "order total out of bounds"));
        break;
      }
      const po: PurchaseOrder = {
        id: action.poId,
        supplierId: action.supplierId,
        lines: action.lines,
        status: "draft",
        note: action.note,
        createdAtMinute: state.clockMinute,
        requestedDeliveryDay: action.requestedDeliveryDay,
        managerApproved: false,
        approvals: [],
        amendments: [],
        budgetCommittedMinor: 0,
      };
      state.purchaseOrders[action.poId] = po;
      effects.push(`drafted ${action.poId} (${total} minor)`);
      break;
    }

    case "submit_purchase_order": {
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (po.status !== "draft") {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO is ${po.status}, not draft`));
        break;
      }
      po.status = "submitted";
      effects.push(`submitted ${po.id}`);
      break;
    }

    case "request_approval": {
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (po.status !== "submitted") {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO must be submitted (is ${po.status})`));
        break;
      }
      po.status = "pending_approval";
      state.pendingEvents.push({
        id: `approval:${po.id}`,
        fireAtMinute: state.clockMinute + 1440,
        kind: "approval_response",
        payload: { poId: po.id },
        fired: false,
      });
      effects.push(`approval requested for ${po.id}; manager response due in 1 day`);
      break;
    }

    case "approve_purchase_order": {
      if (actor.role !== "manager") {
        errors.push(err("PERMISSION_DENIED", "only the manager actor may approve purchase orders"));
        break;
      }
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (!["submitted", "pending_approval"].includes(po.status)) {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO is ${po.status}`));
        break;
      }
      po.managerApproved = true;
      po.approvals.push({ atMinute: state.clockMinute, approvedBy: actor.id });
      effects.push(`manager approved ${po.id}`);
      break;
    }

    case "authorize_purchase_order": {
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (!["submitted", "pending_approval"].includes(po.status)) {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO is ${po.status}, cannot authorize`));
        break;
      }
      const total = poTotalMinor(po.lines);
      if (state.budget.committedMinor + total > state.policy.budgetMinor) {
        errors.push(
          err(
            "POLICY_BUDGET_EXCEEDED",
            `committing ${total} would exceed budget (committed ${state.budget.committedMinor})`,
          ),
        );
        break;
      }
      if (total > state.policy.approvalThresholdMinor && !po.managerApproved) {
        errors.push(
          err(
            "POLICY_AUTH_REQUIRED",
            `orders above ${state.policy.approvalThresholdMinor} minor require recorded manager approval`,
          ),
        );
        break;
      }
      po.status = "authorized";
      po.budgetCommittedMinor = total;
      state.budget.committedMinor += total;
      // Causal delivery: arrival scheduled from the supplier's lead time and the
      // PO as it stands at arrival (amendments before arrival are reflected).
      const supplier = state.suppliers[po.supplierId];
      state.pendingEvents.push({
        id: `delivery:${po.id}`,
        fireAtMinute: state.clockMinute + (supplier?.leadTimeDays ?? 3) * 1440,
        kind: "delivery_arrival",
        payload: { poId: po.id, deliveryId: `DV:${po.id}`, carrierNote: "" },
        fired: false,
      });
      effects.push(`authorized ${po.id}; committed ${total} minor`);
      break;
    }

    case "cancel_purchase_order": {
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (["canceled", "closed", "received"].includes(po.status)) {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO is ${po.status}, cannot cancel`));
        break;
      }
      state.budget.committedMinor -= po.budgetCommittedMinor;
      po.budgetCommittedMinor = 0;
      po.status = "canceled";
      po.note += `\n[canceled: ${action.reason}]`;
      effects.push(`canceled ${po.id}`);
      break;
    }

    case "amend_purchase_order": {
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (!["draft", "submitted", "authorized", "partially_received"].includes(po.status)) {
        errors.push(err("POLICY_TRANSITION_INVALID", `PO is ${po.status}, cannot amend`));
        break;
      }
      errors.push(...validatePoLines(state, po.supplierId, action.addLines));
      if (action.note.length > 2000) errors.push(err("PAYLOAD_INVALID", "note too long"));
      if (errors.length) break;

      const priorLines = po.lines.map((l) => ({ ...l }));
      let lines = po.lines.filter((l) => !action.removeLines.includes(l.itemId));
      for (const change of action.qtyChanges) {
        const target = lines.find((l) => l.itemId === change.itemId);
        if (!target) {
          errors.push(err("POLICY_REF_MISSING", `cannot change qty of missing line ${change.itemId}`));
          break;
        }
        if (!Number.isInteger(change.newQty) || change.newQty < 1 || change.newQty > MAX_QTY) {
          errors.push(err("POLICY_QTY_INVALID", `invalid new qty for ${change.itemId}`));
          break;
        }
        target.qty = change.newQty;
      }
      if (errors.length) break;
      for (const add of action.addLines) {
        const existing = lines.find((l) => l.itemId === add.itemId);
        if (existing) existing.qty += add.qty;
        else lines.push({ ...add });
      }
      const newTotal = poTotalMinor(lines);
      const delta = newTotal - poTotalMinor(po.lines);
      if (
        po.status === "authorized" &&
        state.budget.committedMinor + delta > state.policy.budgetMinor &&
        delta > 0
      ) {
        errors.push(err("POLICY_BUDGET_EXCEEDED", "amendment would exceed remaining budget"));
        break;
      }
      if (
        newTotal > state.policy.approvalThresholdMinor &&
        !po.managerApproved &&
        po.status === "authorized"
      ) {
        errors.push(err("POLICY_AUTH_REQUIRED", "amendment pushes order above approval threshold"));
        break;
      }
      po.amendments.push({
        atMinute: state.clockMinute,
        note: action.note,
        addedLines: action.addLines,
        removedLines: action.removeLines,
        qtyChanges: action.qtyChanges,
        priorLines,
      });
      po.lines = lines;
      if (po.status === "authorized") {
        state.budget.committedMinor += delta;
        po.budgetCommittedMinor += delta;
      }
      effects.push(`amended ${po.id} (delta ${delta} minor)`);
      break;
    }

    case "record_delivery": {
      const delivery = state.deliveries[action.deliveryId];
      if (!delivery) {
        errors.push(err("POLICY_REF_MISSING", `unknown delivery ${action.deliveryId}`));
        break;
      }
      if (delivery.status !== "arrived") {
        errors.push(err("POLICY_TRANSITION_INVALID", `delivery is ${delivery.status}`));
        break;
      }
      if (sortedLines(action.verifiedLines) !== sortedLines(delivery.lines)) {
        errors.push(
          err("DELIVERY_MISMATCH", "verified lines do not match what the carrier delivered"),
        );
        break;
      }
      const po = state.purchaseOrders[delivery.poId];
      if (!po || po.status === "canceled") {
        errors.push(err("POLICY_TRANSITION_INVALID", "delivery has no active PO"));
        break;
      }
      if (po.status === "draft" || po.status === "submitted" || po.status === "pending_approval") {
        errors.push(err("POLICY_TEMPORAL_INVALID", "cannot receive against a PO that is not authorized"));
        break;
      }
      delivery.status = "checked_in";
      delivery.checkedInAtMinute = state.clockMinute;
      delivery.note = action.note;

      const received: Record<string, number> = {};
      for (const d of Object.values(state.deliveries)) {
        if (d.poId === po.id && d.status === "checked_in") {
          for (const l of d.lines) {
            const key = l.substituteFor ?? l.itemId;
            received[key] = (received[key] ?? 0) + l.qty;
          }
        }
      }
      const complete = po.lines.every((l) => (received[l.itemId] ?? 0) >= l.qty);
      po.status = complete ? "received" : "partially_received";

      const amount = deliveryAccrualMinor(po, delivery);
      const txn = accrualTxn(`accrual:${delivery.id}`, state.clockMinute, delivery.id, amount);
      state.ledger.txns.push(txn);
      effects.push(`checked in ${delivery.id}; accrued ${amount} minor to AP`);
      break;
    }

    case "receive_invoice": {
      if (state.invoices[action.invoiceId]) {
        errors.push(err("PAYLOAD_INVALID", `invoiceId ${action.invoiceId} already exists`));
        break;
      }
      const dupNumber = Object.values(state.invoices).some(
        (i) => i.invoiceNumber === action.invoiceNumber && i.supplierId === action.supplierId,
      );
      if (dupNumber) {
        errors.push(err("POLICY_DUPLICATE_INVOICE", "an invoice with this number already exists"));
        break;
      }
      const po = state.purchaseOrders[action.poId];
      if (!po) {
        errors.push(err("POLICY_REF_MISSING", `unknown PO ${action.poId}`));
        break;
      }
      if (po.supplierId !== action.supplierId) {
        errors.push(err("POLICY_REF_MISSING", "PO belongs to a different supplier"));
        break;
      }
      if (action.currency !== state.policy.currency) {
        errors.push(err("PAYLOAD_INVALID", `this episode accepts ${state.policy.currency} only`));
        break;
      }
      const computed = action.lines.reduce((s, l) => s + l.qty * l.unitPriceMinor, 0);
      if (computed !== action.amountMinor || action.amountMinor <= 0) {
        errors.push(err("PAYLOAD_INVALID", "amount must equal sum of line totals"));
        break;
      }
      if (!Number.isInteger(action.dueDay) || action.dueDay < day) {
        errors.push(err("POLICY_TEMPORAL_INVALID", "due day cannot be in the past"));
        break;
      }
      const anyDelivery = Object.values(state.deliveries).some(
        (d) => d.poId === action.poId && d.status === "checked_in",
      );
      if (!anyDelivery) {
        errors.push(err("POLICY_TEMPORAL_INVALID", "invoice may not precede a recorded delivery"));
        break;
      }
      const invoice: Invoice = {
        id: action.invoiceId,
        invoiceNumber: action.invoiceNumber,
        supplierId: action.supplierId,
        poId: action.poId,
        deliveryId: null,
        lines: action.lines,
        amountMinor: action.amountMinor,
        adjustedAmountMinor: null,
        currency: action.currency,
        status: "received",
        dueDay: action.dueDay,
        receivedAtMinute: state.clockMinute,
        duplicateOfId: null,
        disputeReason: null,
        settlementTxnIds: [],
      };
      state.invoices[action.invoiceId] = invoice;
      effects.push(`invoice ${action.invoiceNumber} recorded`);
      break;
    }

    case "match_invoice": {
      const invoice = state.invoices[action.invoiceId];
      if (!invoice) {
        errors.push(err("POLICY_REF_MISSING", `unknown invoice ${action.invoiceId}`));
        break;
      }
      if (invoice.status !== "received") {
        errors.push(err("POLICY_TRANSITION_INVALID", `invoice is ${invoice.status}`));
        break;
      }
      const delivery = state.deliveries[action.deliveryId];
      if (!delivery) {
        errors.push(err("POLICY_REF_MISSING", `unknown delivery ${action.deliveryId}`));
        break;
      }
      if (delivery.status !== "checked_in") {
        errors.push(err("POLICY_TRANSITION_INVALID", "delivery is not checked in"));
        break;
      }
      if (delivery.poId !== action.poId || invoice.poId !== action.poId) {
        errors.push(err("POLICY_REF_MISSING", "invoice/delivery/PO mismatch"));
        break;
      }
      if (invoice.currency !== state.policy.currency) {
        errors.push(
          err("PAYLOAD_INVALID", `invoice currency ${invoice.currency} cannot be processed in this ${state.policy.currency} ledger`),
        );
        break;
      }
      invoice.deliveryId = delivery.id;
      invoice.status = "matched";
      effects.push(`matched ${invoice.id} to ${action.poId}/${delivery.id}`);
      break;
    }

    case "approve_invoice": {
      const invoice = state.invoices[action.invoiceId];
      if (!invoice) {
        errors.push(err("POLICY_REF_MISSING", `unknown invoice ${action.invoiceId}`));
        break;
      }
      if (invoice.status !== "matched") {
        errors.push(err("POLICY_TRANSITION_INVALID", `invoice is ${invoice.status}, must be matched`));
        break;
      }
      const po = state.purchaseOrders[invoice.poId!];
      const delivery = state.deliveries[invoice.deliveryId!];
      if (!po || !delivery) {
        errors.push(err("POLICY_REF_MISSING", "invoice references missing PO/delivery"));
        break;
      }
      const accrual = deliveryAccrualMinor(po, delivery);
      const approvedAmount = action.adjustedAmountMinor ?? invoice.amountMinor;
      if (!Number.isInteger(approvedAmount) || approvedAmount <= 0) {
        errors.push(err("PAYLOAD_INVALID", "approved amount must be a positive integer"));
        break;
      }
      if (approvedAmount > accrual) {
        errors.push(
          err(
            "OVER_ACCRUAL",
            `approved amount ${approvedAmount} exceeds delivered value ${accrual} (undelivered goods may not be settled)`,
          ),
        );
        break;
      }
      invoice.adjustedAmountMinor = approvedAmount;
      invoice.status = "approved";
      effects.push(
        `approved ${invoice.id} for ${approvedAmount} minor` +
          (approvedAmount < invoice.amountMinor ? " (short-pay recorded)" : ""),
      );
      break;
    }

    case "schedule_payment": {
      const invoice = state.invoices[action.invoiceId];
      if (!invoice) {
        errors.push(err("POLICY_REF_MISSING", `unknown invoice ${action.invoiceId}`));
        break;
      }
      if (invoice.status === "paid" || invoice.settlementTxnIds.length > 0) {
        errors.push(err("POLICY_DUPLICATE_SETTLEMENT", "invoice is already settled"));
        break;
      }
      if (invoice.status !== "approved") {
        errors.push(err("POLICY_TRANSITION_INVALID", `invoice is ${invoice.status}, must be approved`));
        break;
      }
      if (!Number.isInteger(action.payDay) || action.payDay < day) {
        errors.push(err("POLICY_TEMPORAL_INVALID", "pay day cannot be in the past"));
        break;
      }
      invoice.status = "scheduled";
      invoice.dueDay = action.payDay;
      effects.push(`payment for ${invoice.id} scheduled day ${action.payDay}`);
      break;
    }

    case "run_payment_run": {
      const targets = action.invoiceIds;
      if (targets.length === 0) {
        errors.push(err("PAYLOAD_INVALID", "invoiceIds must not be empty"));
        break;
      }
      for (const id of targets) {
        const invoice = state.invoices[id];
        if (!invoice) {
          errors.push(err("POLICY_REF_MISSING", `unknown invoice ${id}`));
          break;
        }
        if (invoice.status === "paid" || invoice.settlementTxnIds.length > 0) {
          errors.push(err("POLICY_DUPLICATE_SETTLEMENT", `invoice ${id} is already settled`));
          break;
        }
        if (invoice.status !== "scheduled") {
          errors.push(err("POLICY_TRANSITION_INVALID", `invoice ${id} is ${invoice.status}, not scheduled`));
          break;
        }
        if (invoice.dueDay > action.payDay) {
          errors.push(err("POLICY_TEMPORAL_INVALID", `invoice ${id} is not due until day ${invoice.dueDay}`));
          break;
        }
      }
      if (errors.length) break;
      for (const id of targets) {
        const invoice = state.invoices[id]!;
        const amount = invoice.adjustedAmountMinor ?? invoice.amountMinor;
        const txn = settlementTxn(`settle:${invoice.id}`, state.clockMinute, invoice.id, amount);
        state.ledger.txns.push(txn);
        invoice.status = "paid";
        invoice.settlementTxnIds.push(txn.id);
        effects.push(`settled ${invoice.id} for ${amount} minor`);
      }
      break;
    }

    case "dispute_invoice": {
      const invoice = state.invoices[action.invoiceId];
      if (!invoice) {
        errors.push(err("POLICY_REF_MISSING", `unknown invoice ${action.invoiceId}`));
        break;
      }
      if (invoice.status === "paid" || invoice.settlementTxnIds.length > 0) {
        errors.push(err("POLICY_TRANSITION_INVALID", "settled invoices cannot be disputed"));
        break;
      }
      invoice.status = "disputed";
      invoice.disputeReason = action.reason;
      effects.push(`disputed ${invoice.id}: ${action.reason}`);
      break;
    }

    case "flag_duplicate_invoice": {
      const invoice = state.invoices[action.invoiceId];
      const original = state.invoices[action.duplicateOfId];
      if (!invoice || !original) {
        errors.push(err("POLICY_REF_MISSING", "unknown invoice"));
        break;
      }
      if (invoice.id === original.id) {
        errors.push(err("PAYLOAD_INVALID", "invoice cannot duplicate itself"));
        break;
      }
      if (invoice.status === "paid" || invoice.settlementTxnIds.length > 0) {
        errors.push(err("POLICY_TRANSITION_INVALID", "settled invoices cannot be flagged as duplicates"));
        break;
      }
      invoice.status = "flagged_duplicate";
      invoice.duplicateOfId = original.id;
      effects.push(`flagged ${invoice.id} as suspected duplicate of ${original.id}`);
      break;
    }

    case "create_ticket": {
      if (state.tickets[action.ticketId]) {
        errors.push(err("PAYLOAD_INVALID", `ticketId ${action.ticketId} already exists`));
        break;
      }
      if (action.title.length > 200 || action.note.length > 2000) {
        errors.push(err("PAYLOAD_INVALID", "title/note too long"));
        break;
      }
      state.tickets[action.ticketId] = {
        id: action.ticketId,
        title: action.title,
        customer: action.customer,
        status: "open",
        priority: action.priority,
        dueDay: action.dueDay,
        notes: [{ atMinute: state.clockMinute, text: action.note }],
        commitments: [],
      };
      effects.push(`created ticket ${action.ticketId}`);
      break;
    }

    case "update_ticket": {
      const ticket = state.tickets[action.ticketId];
      if (!ticket) {
        errors.push(err("POLICY_REF_MISSING", `unknown ticket ${action.ticketId}`));
        break;
      }
      if (action.note.length > 2000) {
        errors.push(err("PAYLOAD_INVALID", "note too long"));
        break;
      }
      if (action.status) {
        const from = TICKET_ORDER.indexOf(ticket.status);
        const to = TICKET_ORDER.indexOf(action.status);
        if (to < from) {
          errors.push(err("POLICY_TRANSITION_INVALID", "ticket status cannot move backwards"));
          break;
        }
        ticket.status = action.status;
      }
      if (action.commitment) {
        if (!Number.isInteger(action.commitment.promisedDay) || action.commitment.promisedDay < day) {
          errors.push(err("POLICY_TEMPORAL_INVALID", "promised day cannot be in the past"));
          break;
        }
        ticket.commitments.push({
          atMinute: state.clockMinute,
          promisedDay: action.commitment.promisedDay,
          text: action.commitment.text,
        });
      }
      ticket.notes.push({
        atMinute: state.clockMinute,
        text: action.note,
        ...(action.reference ? { reference: action.reference } : {}),
      });
      effects.push(`ticket ${ticket.id} updated`);
      break;
    }

    case "send_message": {
      if (state.messages.some((m) => m.id === action.messageId)) {
        errors.push(err("PAYLOAD_INVALID", `messageId ${action.messageId} already exists`));
        break;
      }
      if (!action.to || action.body.length > 5000 || action.subject.length > 200) {
        errors.push(err("PAYLOAD_INVALID", "invalid message fields"));
        break;
      }
      if (action.commitment) {
        if (!Number.isInteger(action.commitment.promisedDay) || action.commitment.promisedDay < day) {
          errors.push(err("POLICY_TEMPORAL_INVALID", "promised day cannot be in the past"));
          break;
        }
      }
      state.messages.push({
        id: action.messageId,
        direction: "out",
        from: "you",
        to: action.to,
        subject: action.subject,
        body: action.body,
        atMinute: state.clockMinute,
        relatedTo: action.relatedTo,
        commitment: action.commitment
          ? { atMinute: state.clockMinute, promisedDay: action.commitment.promisedDay, text: action.commitment.text }
          : null,
      });
      effects.push(`message sent to ${action.to}`);
      break;
    }

    case "update_spreadsheet": {
      const wb = state.workbooks[action.workbookId];
      if (!wb) {
        errors.push(err("POLICY_REF_MISSING", `unknown workbook ${action.workbookId}`));
        break;
      }
      if (action.cells.length > 200) {
        errors.push(err("PAYLOAD_INVALID", "too many cells in one action"));
        break;
      }
      for (const cell of action.cells) {
        try {
          const value = cell.formula !== undefined ? { formula: cell.formula } : cell.value;
          if (typeof value === "object" && value !== null && "formula" in value) {
            evaluateFormula(wb, value.formula); // dry validation
          }
          setCell(wb, cell.ref, value, state.clockMinute);
        } catch (e) {
          errors.push(err("PAYLOAD_INVALID", `cell ${cell.ref}: ${(e as Error).message}`));
          break;
        }
      }
      if (errors.length) break;
      effects.push(`workbook ${wb.id}: ${action.cells.length} cell(s) updated`);
      break;
    }

    case "add_work_note": {
      if (action.text.length > 2000) {
        errors.push(err("PAYLOAD_INVALID", "note too long"));
        break;
      }
      state.workNotes.push({ atMinute: state.clockMinute, text: action.text });
      effects.push("work note added");
      break;
    }

    case "request_help": {
      if (action.question.length > 1000) {
        errors.push(err("PAYLOAD_INVALID", "question too long"));
        break;
      }
      state.helpRequests.push({ atMinute: state.clockMinute, question: action.question, outcome: null });
      effects.push("help requested");
      break;
    }

    case "submit_work": {
      if (action.summary.length > 5000) {
        errors.push(err("PAYLOAD_INVALID", "summary too long"));
        break;
      }
      state.status = "submitted";
      state.submission = { atMinute: state.clockMinute, summary: action.summary };
      effects.push("work submitted");
      break;
    }
  }
  return { errors, effects };
}

function applyScheduledEvent(state: EpisodeState, ev: ScheduledEvent): string[] {
  const effects: string[] = [];
  switch (ev.kind) {
    case "message":
    case "reminder": {
      state.messages.push({
        id: `${ev.id}:msg`,
        direction: "in",
        from: String(ev.payload.from ?? "unknown"),
        to: "you",
        subject: String(ev.payload.subject ?? ""),
        body: String(ev.payload.body ?? ""),
        atMinute: ev.fireAtMinute,
        relatedTo: (ev.payload.relatedTo as string) ?? null,
        commitment: null,
      });
      // A message may carry a structural schedule change (e.g. a supplier delay).
      const poId = ev.payload.poId as string | undefined;
      const newDay = ev.payload.newRequestedDeliveryDay as number | undefined;
      if (poId && newDay !== undefined && state.purchaseOrders[poId]) {
        state.purchaseOrders[poId]!.requestedDeliveryDay = newDay;
        state.purchaseOrders[poId]!.note += `\n[delivery schedule updated by message at minute ${ev.fireAtMinute}: day ${newDay}]`;
        effects.push(`PO ${poId} delivery schedule updated to day ${newDay}`);
      }
      // A message may also carry a policy change (e.g. revised authority limit).
      const newThreshold = ev.payload.newApprovalThresholdMinor as number | undefined;
      if (newThreshold !== undefined) {
        state.policy.approvalThresholdMinor = newThreshold;
        effects.push(`approval threshold updated to ${newThreshold} minor`);
      }
      effects.push(`message received from ${String(ev.payload.from ?? "unknown")}`);
      break;
    }
    case "approval_response": {
      const poId = String(ev.payload.poId);
      const po = state.purchaseOrders[poId];
      if (po && po.status === "pending_approval") {
        po.managerApproved = true;
        po.approvals.push({ atMinute: ev.fireAtMinute, approvedBy: "Dana Reyes (Operations Manager)" });
        po.status = "submitted";
        state.messages.push({
          id: `${ev.id}:msg`,
          direction: "in",
          from: "Dana Reyes (Operations Manager)",
          to: "you",
          subject: `Approval granted: ${po.id}`,
          body: `Approved: ${po.id}. Keep us within the weekly budget and record the order against the ticket.`,
          atMinute: ev.fireAtMinute,
          relatedTo: po.id,
          commitment: null,
        });
        effects.push(`manager approved ${po.id}`);
      }
      break;
    }
    case "delivery_arrival": {
      const poId = String(ev.payload.poId);
      const po = state.purchaseOrders[poId];
      if (!po || po.status === "canceled") {
        effects.push(`delivery for ${poId} skipped (PO canceled)`);
        break;
      }
      // Static lines are filtered to items actually on the PO (substitution aware);
      // without static lines the delivery mirrors the PO as it stands at arrival.
      const rawLines = (ev.payload.lines as DeliveryLine[] | undefined) ?? undefined;
      const lines: DeliveryLine[] = rawLines
        ? rawLines.filter((l) =>
            po.lines.some((pl) => pl.itemId === l.itemId || pl.itemId === l.substituteFor),
          )
        : po.lines.map((l) => ({ itemId: l.itemId, qty: l.qty }));
      if (lines.length === 0) {
        effects.push(`delivery for ${poId} skipped (no matching PO lines)`);
        break;
      }
      const delivery: Delivery = {
        id: String(ev.payload.deliveryId),
        poId,
        lines,
        status: "arrived",
        arrivedAtMinute: ev.fireAtMinute,
        note: "",
        carrierNote: String(ev.payload.carrierNote ?? ""),
      };
      state.deliveries[delivery.id] = delivery;
      state.messages.push({
        id: `${ev.id}:msg`,
        direction: "in",
        from: "Carrier desk",
        to: "you",
        subject: `Delivery arrived: ${delivery.id}`,
        body:
          `Delivery ${delivery.id} for ${poId} has arrived at the dock. ` +
          `Carrier note: ${delivery.carrierNote || "none"}. Please verify and check in.`,
        atMinute: ev.fireAtMinute,
        relatedTo: delivery.id,
        commitment: null,
      });
      effects.push(`delivery ${delivery.id} arrived`);
      break;
    }
    case "invoice_arrival": {
      const invoice: Invoice = {
        id: String(ev.payload.invoiceId),
        invoiceNumber: String(ev.payload.invoiceNumber),
        supplierId: String(ev.payload.supplierId),
        poId: (ev.payload.poId as string) ?? null,
        deliveryId: null,
        lines: (ev.payload.lines as { itemId: string; qty: number; unitPriceMinor: number }[]) ?? [],
        amountMinor: Number(ev.payload.amountMinor),
        adjustedAmountMinor: null,
        currency: (ev.payload.currency as "CAD" | "USD") ?? "CAD",
        status: "received",
        dueDay: Number(ev.payload.dueDay),
        receivedAtMinute: ev.fireAtMinute,
        duplicateOfId: null,
        disputeReason: null,
        settlementTxnIds: [],
      };
      state.invoices[invoice.id] = invoice;
      state.messages.push({
        id: `${ev.id}:msg`,
        direction: "in",
        from: `${state.suppliers[invoice.supplierId]?.name ?? invoice.supplierId} billing`,
        to: "you",
        subject: `Invoice ${invoice.invoiceNumber}`,
        body: `Invoice ${invoice.invoiceNumber} for ${invoice.amountMinor} minor (due day ${invoice.dueDay}) references ${invoice.poId ?? "no PO"}.`,
        atMinute: ev.fireAtMinute,
        relatedTo: invoice.id,
        commitment: null,
      });
      effects.push(`invoice ${invoice.invoiceNumber} arrived`);
      break;
    }
    case "requirement_change": {
      const add = (ev.payload.addLines as { itemId: string; qty: number }[]) ?? [];
      const remove = (ev.payload.removeLines as string[]) ?? [];
      for (const line of add) {
        const existing = state.requirements.find((r) => r.itemId === line.itemId);
        if (existing) existing.qty = line.qty;
        else state.requirements.push({ itemId: line.itemId, qty: line.qty });
      }
      state.requirements = state.requirements.filter((r) => !remove.includes(r.itemId));
      if (ev.payload.newDueDay !== undefined) {
        state.requirementDueDay = Number(ev.payload.newDueDay);
      }
      state.messages.push({
        id: `${ev.id}:msg`,
        direction: "in",
        from: String(ev.payload.from ?? "customer"),
        to: "you",
        subject: String(ev.payload.subject ?? "Requirement change"),
        body: String(ev.payload.body ?? ""),
        atMinute: ev.fireAtMinute,
        relatedTo: (ev.payload.relatedTo as string) ?? null,
        commitment: null,
      });
      const ticketId = ev.payload.ticketId as string | undefined;
      if (ticketId && state.tickets[ticketId]) {
        state.tickets[ticketId]!.notes.push({
          atMinute: ev.fireAtMinute,
          text: String(ev.payload.body ?? "requirement change received"),
          reference: "requirement_change",
        });
      }
      effects.push("requirements changed");
      break;
    }
    case "price_change": {
      const supplier = state.suppliers[String(ev.payload.supplierId)];
      if (supplier) {
        const entry = supplier.catalog.find((c) => c.itemId === String(ev.payload.itemId));
        if (entry) entry.unitPriceMinor = Number(ev.payload.newPriceMinor);
        state.messages.push({
          id: `${ev.id}:msg`,
          direction: "in",
          from: supplier.name,
          to: "you",
          subject: "Price update notice",
          body: String(ev.payload.body ?? "Catalog price updated for new orders."),
          atMinute: ev.fireAtMinute,
          relatedTo: entry?.itemId ?? null,
          commitment: null,
        });
        effects.push(`price changed for ${String(ev.payload.itemId)} at ${supplier.name}`);
      }
      break;
    }
    case "supplier_cancellation": {
      const poIds = (ev.payload.poIds as string[]) ?? [];
      for (const poId of poIds) {
        const po = state.purchaseOrders[poId];
        if (po && !["canceled", "closed", "received"].includes(po.status)) {
          state.budget.committedMinor -= po.budgetCommittedMinor;
          po.budgetCommittedMinor = 0;
          po.status = "canceled";
          po.note += `\n[supplier cancellation: ${String(ev.payload.reason ?? "")}]`;
        }
      }
      state.messages.push({
        id: `${ev.id}:msg`,
        direction: "in",
        from: String(ev.payload.from ?? "supplier"),
        to: "you",
        subject: String(ev.payload.subject ?? "Order cancellation"),
        body: String(ev.payload.body ?? ""),
        atMinute: ev.fireAtMinute,
        relatedTo: null,
        commitment: null,
      });
      effects.push(`supplier canceled ${poIds.join(", ")}`);
      break;
    }
  }
  return effects;
}

/**
 * Core step: validates revision + idempotency, applies the action, appends the
 * evidence record. STALE_REVISION rejections do not touch state at all.
 */
export function applyAction(
  state: EpisodeState,
  action: Action,
  actor: Actor,
  scenario: ScenarioDefinition,
): Transition {
  const errors: ActionError[] = [];

  if (action.expectedRevision !== state.revision) {
    return {
      ok: false,
      errors: [
        err(
          "STALE_REVISION",
          `expected revision ${action.expectedRevision} but state is at ${state.revision}`,
        ),
      ],
      feedback: "Action rejected: stale revision. Refresh and retry.",
      effects: [],
      state,
    };
  }

  const prior = state.actionLog.find((a) => a.idempotencyKey === action.idempotencyKey);
  if (prior) {
    const samePayload = prior.payloadDigest === payloadDigest(action);
    const next = cloneState(state);
    next.actionLog.push({
      seq: next.actionLog.length,
      actionId: action.actionId,
      idempotencyKey: action.idempotencyKey,
      type: action.type,
      actor,
      atMinute: next.clockMinute,
      outcome: samePayload ? "replayed" : "rejected",
      errors: samePayload ? [] : [err("IDEMPOTENCY_MISMATCH", "key reused with different payload")],
      effects: [],
      payloadDigest: payloadDigest(action),
    });
    next.revision += 1;
    return {
      ok: samePayload,
      errors: samePayload ? [] : [err("IDEMPOTENCY_MISMATCH", "idempotency key reused with a different payload")],
      feedback: samePayload
        ? "Duplicate request recognized; original result stands (no business effect)."
        : "Idempotency key reused with a different payload.",
      effects: [],
      state: next,
    };
  }

  const next = cloneState(state);
  let result: HandlerResult = { errors, effects: [] };

  if (next.status !== "active" && action.type !== "advance_time") {
    result = {
      errors: [err("EPISODE_CLOSED", `episode is ${next.status}`)],
      effects: [],
    };
  } else if (action.type === "advance_time") {
    const before = next.clockMinute;
    const target = Math.min(before + action.minutes, scenario.durationMinutes);
    const effects = advanceClockTo(next, target);
    if (target >= scenario.durationMinutes && next.status === "active") {
      next.status = "expired";
      effects.push("episode time limit reached");
    }
    result = { errors: [], effects };
  } else {
    result = handleAction(next, action, actor);
  }

  const ok = result.errors.length === 0;
  next.actionLog.push({
    seq: next.actionLog.length,
    actionId: action.actionId,
    idempotencyKey: action.idempotencyKey,
    type: action.type,
    actor,
    atMinute: next.clockMinute,
    outcome: ok ? "applied" : "rejected",
    errors: result.errors,
    effects: result.effects,
    payloadDigest: payloadDigest(action),
  });
  next.revision += 1;

  return {
    ok,
    errors: result.errors,
    feedback: ok
      ? result.effects.join("; ") || "Done."
      : `Action rejected: ${result.errors.map((e) => e.message).join("; ")}`,
    effects: result.effects,
    state: next,
  };
}

/** Fire scheduled events up to targetMinute in (fireAtMinute, id) order. */
function advanceClockTo(state: EpisodeState, targetMinute: number): string[] {
  const effects: string[] = [];
  for (;;) {
    const due = state.pendingEvents
      .filter((e) => !e.fired && e.fireAtMinute <= targetMinute)
      .sort((a, b) => a.fireAtMinute - b.fireAtMinute || (a.id < b.id ? -1 : 1));
    const ev = due[0];
    if (!ev) break;
    ev.fired = true;
    effects.push(...applyScheduledEvent(state, ev));
    // Move the logical clock to the event time first so evidence timestamps order correctly.
    state.clockMinute = Math.max(state.clockMinute, ev.fireAtMinute);
  }
  state.clockMinute = Math.max(state.clockMinute, targetMinute);
  return effects;
}

export function cloneState(state: EpisodeState): EpisodeState {
  return structuredClone(state);
}

/** Build the initial derived state for an episode (seeded, deterministic). */
export function buildInitialState(
  scenario: ScenarioDefinition,
  opts: { runId: string; seed: number; condition: "human" | "agent" | "assisted" },
): EpisodeState {
  const items: EpisodeState["items"] = {};
  for (const item of scenario.items) items[item.id] = item;
  const suppliers: EpisodeState["suppliers"] = {};
  for (const s of scenario.suppliers) suppliers[s.id] = s;

  return {
    runId: opts.runId,
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    seed: opts.seed,
    condition: opts.condition,
    clockMinute: 0,
    status: "active",
    revision: 0,
    policy: {
      approvalThresholdMinor: scenario.policy.approvalThresholdMinor,
      budgetMinor: scenario.policy.budgetMinor,
      currency: scenario.policy.currency,
      helpPolicy: scenario.policy.helpPolicy,
    },
    items,
    suppliers,
    purchaseOrders: structuredClone(scenario.initial.purchaseOrders ?? {}) as Record<
      string,
      PurchaseOrder
    >,
    deliveries: structuredClone(scenario.initial.deliveries ?? {}) as Record<string, Delivery>,
    invoices: structuredClone(scenario.initial.invoices ?? {}) as Record<string, Invoice>,
    ledger: {
      opening: structuredClone(scenario.initial.ledgerOpening),
      txns: [],
    },
    tickets: structuredClone(scenario.initial.tickets) as Record<string, Ticket>,
    messages: structuredClone(scenario.initial.messages) as Message[],
    workbooks: structuredClone(scenario.initial.workbooks) as Record<string, Workbook>,
    workNotes: structuredClone(scenario.initial.workNotes ?? []) as WorkNote[],
    helpRequests: [],
    budget: { committedMinor: scenario.initial.committedMinor ?? 0 },
    requirements: structuredClone(scenario.requirements.lines),
    requirementDueDay: scenario.requirements.dueDay,
    pendingEvents: structuredClone(scenario.scheduledEvents),
    actionLog: [],
    submission: null,
  };
}
