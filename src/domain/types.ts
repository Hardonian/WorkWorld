/**
 * WorkWorld domain types — pure TypeScript, no React/Next imports.
 * Money is integer minor units with a declared currency. Quantities are
 * bounded integers. Time is logical minutes since episode start.
 */

export type Minor = number; // integer minor units (cents)
export type Currency = "CAD" | "USD";
export type ItemId = string;
export type SupplierId = string;
export type PoId = string;
export type DeliveryId = string;
export type InvoiceId = string;
export type TicketId = string;
export type MessageId = string;
export type WorkbookId = string;
export type AccountId = "cash" | "accounts_receivable" | "inventory" | "accounts_payable" | "opening_equity";

export const MAX_QTY = 10_000;
export const MAX_MONEY_MINOR = 100_000_000; // 1M major units sanity bound

export interface Item {
  id: ItemId;
  name: string;
  unit: string; // "case" | "box" | "each"
}

export interface CatalogEntry {
  itemId: ItemId;
  unitPriceMinor: Minor;
}

export interface Supplier {
  id: SupplierId;
  name: string;
  leadTimeDays: number;
  paymentTermsDays: number;
  catalog: CatalogEntry[];
}

export type PoStatus =
  | "draft"
  | "submitted"
  | "pending_approval"
  | "authorized"
  | "partially_received"
  | "received"
  | "canceled"
  | "closed";

export interface PoLine {
  itemId: ItemId;
  qty: number;
  unitPriceMinor: Minor;
}

export interface PoAmendment {
  atMinute: number;
  note: string;
  addedLines: PoLine[];
  removedLines: ItemId[];
  qtyChanges: { itemId: ItemId; newQty: number }[];
  priorLines: PoLine[]; // evidence: what the lines were before this amendment
}

export interface PurchaseOrder {
  id: PoId;
  supplierId: SupplierId;
  lines: PoLine[];
  status: PoStatus;
  note: string;
  createdAtMinute: number;
  requestedDeliveryDay: number;
  managerApproved: boolean;
  approvals: { atMinute: number; approvedBy: string }[];
  amendments: PoAmendment[];
  budgetCommittedMinor: Minor;
}

export interface DeliveryLine {
  itemId: ItemId;
  qty: number;
  substituteFor?: ItemId; // explicit substitution record (never silent)
}

export interface Delivery {
  id: DeliveryId;
  poId: PoId;
  lines: DeliveryLine[];
  status: "arrived" | "checked_in";
  arrivedAtMinute: number;
  checkedInAtMinute?: number;
  note: string;
  carrierNote: string;
}

export type InvoiceStatus =
  | "received"
  | "matched"
  | "approved"
  | "scheduled"
  | "paid"
  | "disputed"
  | "flagged_duplicate";

export interface InvoiceLine {
  itemId: ItemId;
  qty: number;
  unitPriceMinor: Minor;
}

export interface Invoice {
  id: InvoiceId;
  invoiceNumber: string;
  supplierId: SupplierId;
  poId: PoId | null;
  deliveryId: DeliveryId | null;
  lines: InvoiceLine[];
  amountMinor: Minor;
  adjustedAmountMinor: Minor | null; // short-pay amount when approved
  currency: Currency;
  status: InvoiceStatus;
  dueDay: number;
  receivedAtMinute: number;
  duplicateOfId: InvoiceId | null;
  disputeReason: string | null;
  settlementTxnIds: string[];
}

export interface LedgerTxn {
  id: string;
  atMinute: number;
  memo: string;
  sourceType: "opening" | "delivery_accrual" | "settlement";
  sourceId: string;
  entries: {
    account: Exclude<AccountId, "opening_equity">;
    debitMinor: Minor;
    creditMinor: Minor;
  }[];
}

export interface TicketNote {
  atMinute: number;
  text: string;
  reference?: string;
}

export interface Commitment {
  atMinute: number;
  promisedDay: number;
  text: string;
}

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";

export interface Ticket {
  id: TicketId;
  title: string;
  customer: string;
  status: TicketStatus;
  priority: "low" | "normal" | "high";
  dueDay: number;
  notes: TicketNote[];
  commitments: Commitment[];
}

export interface Message {
  id: MessageId;
  direction: "in" | "out";
  from: string;
  to: string;
  subject: string;
  body: string;
  atMinute: number;
  relatedTo: string | null;
  commitment: Commitment | null;
}

export type CellValue =
  | number
  | string
  | { formula: string };

export interface Workbook {
  id: WorkbookId;
  name: string;
  cells: Record<string, CellValue>;
  /** append-only edit history (evidence) */
  edits: { atMinute: number; ref: string; value: CellValue }[];
}

export interface WorkNote {
  atMinute: number;
  text: string;
}

export interface HelpRequest {
  atMinute: number;
  question: string;
  outcome: string | null;
}

export interface RequirementLine {
  itemId: ItemId;
  qty: number;
}

export interface ScheduledEvent {
  id: string;
  fireAtMinute: number;
  kind:
    | "message"
    | "approval_response"
    | "delivery_arrival"
    | "invoice_arrival"
    | "requirement_change"
    | "price_change"
    | "supplier_cancellation"
    | "reminder";
  payload: Record<string, unknown>;
  fired: boolean;
}

export type ActorKind = "human" | "agent" | "assisted" | "manager" | "system";

export interface Actor {
  id: string;
  kind: ActorKind;
  role: "participant" | "manager" | "system";
}

// ---------------------------------------------------------------------------
// Actions — one typed interface for UI and agents.
// ---------------------------------------------------------------------------

export interface ActionBase {
  actionId: string; // client-supplied unique id
  idempotencyKey: string;
  expectedRevision: number;
}

export type Action =
  | (ActionBase & { type: "advance_time"; minutes: number })
  | (ActionBase & {
      type: "draft_purchase_order";
      poId: PoId;
      supplierId: SupplierId;
      lines: PoLine[];
      requestedDeliveryDay: number;
      note: string;
    })
  | (ActionBase & { type: "submit_purchase_order"; poId: PoId })
  | (ActionBase & { type: "request_approval"; poId: PoId })
  | (ActionBase & { type: "approve_purchase_order"; poId: PoId })
  | (ActionBase & { type: "authorize_purchase_order"; poId: PoId })
  | (ActionBase & { type: "cancel_purchase_order"; poId: PoId; reason: string })
  | (ActionBase & {
      type: "amend_purchase_order";
      poId: PoId;
      addLines: PoLine[];
      removeLines: ItemId[];
      qtyChanges: { itemId: ItemId; newQty: number }[];
      note: string;
    })
  | (ActionBase & {
      type: "record_delivery";
      deliveryId: DeliveryId;
      verifiedLines: DeliveryLine[];
      note: string;
    })
  | (ActionBase & {
      type: "receive_invoice";
      invoiceId: InvoiceId;
      invoiceNumber: string;
      supplierId: SupplierId;
      poId: PoId;
      lines: InvoiceLine[];
      amountMinor: Minor;
      currency: Currency;
      dueDay: number;
    })
  | (ActionBase & { type: "match_invoice"; invoiceId: InvoiceId; poId: PoId; deliveryId: DeliveryId })
  | (ActionBase & { type: "approve_invoice"; invoiceId: InvoiceId; adjustedAmountMinor: Minor | null; note: string })
  | (ActionBase & { type: "schedule_payment"; invoiceId: InvoiceId; payDay: number })
  | (ActionBase & { type: "run_payment_run"; payDay: number; invoiceIds: InvoiceId[] })
  | (ActionBase & { type: "dispute_invoice"; invoiceId: InvoiceId; reason: string; note: string })
  | (ActionBase & { type: "flag_duplicate_invoice"; invoiceId: InvoiceId; duplicateOfId: InvoiceId })
  | (ActionBase & {
      type: "create_ticket";
      ticketId: TicketId;
      title: string;
      customer: string;
      priority: "low" | "normal" | "high";
      dueDay: number;
      note: string;
    })
  | (ActionBase & {
      type: "update_ticket";
      ticketId: TicketId;
      status: TicketStatus | null;
      note: string;
      reference: string | null;
      commitment: { promisedDay: number; text: string } | null;
    })
  | (ActionBase & {
      type: "send_message";
      messageId: MessageId;
      to: string;
      subject: string;
      body: string;
      relatedTo: string | null;
      commitment: { promisedDay: number; text: string } | null;
    })
  | (ActionBase & {
      type: "update_spreadsheet";
      workbookId: WorkbookId;
      cells: { ref: string; value: number | string; formula?: string }[];
    })
  | (ActionBase & { type: "add_work_note"; text: string })
  | (ActionBase & { type: "request_help"; question: string })
  | (ActionBase & { type: "submit_work"; summary: string });

export type ActionType = Action["type"];

/** Distributive omit — keeps the discriminated-union shape for callers that
 *  supply payloads (engine fills actionId/idempotencyKey/expectedRevision). */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ActionInput = DistributiveOmit<
  Action,
  "actionId" | "idempotencyKey" | "expectedRevision"
>;

export interface ActionRecord {
  seq: number;
  actionId: string;
  idempotencyKey: string;
  type: ActionType;
  actor: Actor;
  atMinute: number;
  outcome: "applied" | "rejected" | "replayed";
  errors: ActionError[];
  effects: string[];
  payloadDigest: string;
}

export type ErrorCode =
  | "STALE_REVISION"
  | "IDEMPOTENCY_MISMATCH"
  | "EPISODE_CLOSED"
  | "PERMISSION_DENIED"
  | "POLICY_AUTH_REQUIRED"
  | "POLICY_BUDGET_EXCEEDED"
  | "POLICY_TRANSITION_INVALID"
  | "POLICY_REF_MISSING"
  | "POLICY_TEMPORAL_INVALID"
  | "POLICY_QTY_INVALID"
  | "POLICY_DUPLICATE_SETTLEMENT"
  | "POLICY_DUPLICATE_INVOICE"
  | "DELIVERY_MISMATCH"
  | "OVER_ACCRUAL"
  | "PAYLOAD_INVALID";

export interface ActionError {
  code: ErrorCode;
  message: string;
}

export interface Transition {
  ok: boolean;
  errors: ActionError[];
  feedback: string;
  effects: string[];
  state: EpisodeState;
}

export interface EpisodeState {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  seed: number;
  condition: "human" | "agent" | "assisted";
  clockMinute: number;
  status: "active" | "submitted" | "expired";
  revision: number;
  policy: {
    approvalThresholdMinor: Minor;
    budgetMinor: Minor;
    currency: Currency;
    helpPolicy: { maxHelpRequests: number; fatalBeyond: boolean };
  };
  items: Record<ItemId, Item>;
  suppliers: Record<SupplierId, Supplier>;
  purchaseOrders: Record<PoId, PurchaseOrder>;
  deliveries: Record<DeliveryId, Delivery>;
  invoices: Record<InvoiceId, Invoice>;
  ledger: {
    opening: Record<Exclude<AccountId, "opening_equity">, Minor>;
    txns: LedgerTxn[];
  };
  tickets: Record<TicketId, Ticket>;
  messages: Message[];
  workbooks: Record<WorkbookId, Workbook>;
  workNotes: WorkNote[];
  helpRequests: HelpRequest[];
  budget: { committedMinor: Minor };
  requirements: RequirementLine[];
  requirementDueDay: number;
  pendingEvents: ScheduledEvent[];
  actionLog: ActionRecord[];
  submission: { atMinute: number; summary: string } | null;
}
