/**
 * Scenario definition schema (zod). A scenario is DATA: initial state, policy,
 * available information, scheduled events, terminal conditions, objectives,
 * and declarative grading requirements. Episodes instantiate scenarios with a
 * seed and run id.
 */
import { z } from "zod";

export const ItemDef = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
});

export const SupplierDef = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  leadTimeDays: z.number().int().min(1).max(30),
  paymentTermsDays: z.number().int().min(1).max(120),
  catalog: z.array(
    z.object({ itemId: z.string(), unitPriceMinor: z.number().int().positive() }),
  ),
});

export const ScheduledEventDef = z.object({
  id: z.string().min(1),
  fireAtMinute: z.number().int().nonnegative(),
  kind: z.enum([
    "message",
    "approval_response",
    "delivery_arrival",
    "invoice_arrival",
    "requirement_change",
    "price_change",
    "supplier_cancellation",
    "reminder",
  ]),
  payload: z.record(z.string(), z.unknown()),
  fired: z.literal(false),
});

export const RequirementPredicate = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("order_placed"),
    params: z.object({
      lines: z.array(
        z.object({
          itemId: z.string(),
          qty: z.number().int().positive(),
          comparison: z.enum(["eq", "gte"]),
        }),
      ),
      supplierId: z.string().optional(),
      maxLeadTimeDays: z.number().int().positive().optional(),
      afterMinute: z.number().int().nonnegative().optional(),
    }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("ticket_note_referencing_entity"),
    params: z.object({ ticketId: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("po_amended"),
    params: z.object({ poId: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("workbook_contains_value"),
    params: z.object({ workbookId: z.string(), valueMinor: z.number().int() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("at_least_one"),
    params: z.object({ ids: z.array(z.string()).min(1) }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("outbound_message"),
    params: z.object({
      relatedTo: z.string().optional(),
      toContains: z.string().optional(),
    }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("delivery_checked_in"),
    params: z.object({ poId: z.string().optional(), deliveryId: z.string().optional() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("invoice_status"),
    params: z.object({
      invoiceId: z.string(),
      status: z.enum(["matched", "approved", "scheduled", "paid", "disputed", "flagged_duplicate"]),
    }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("no_settlement_for"),
    params: z.object({ invoiceIds: z.array(z.string()) }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("settlement_amount_exact"),
    params: z.object({ invoiceId: z.string(), amountMinor: z.number().int().positive() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("commitment_recorded"),
    params: z.object({ ticketId: z.string(), afterMinute: z.number().int().nonnegative() }),
  }),
]);

export const RequiredUpdate = z.discriminatedUnion("kind", [
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("ticket_note_with_reference"),
    params: z.object({ ticketId: z.string(), reference: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("ticket_note_referencing_entity"),
    params: z.object({ ticketId: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("ticket_status_min"),
    params: z.object({
      ticketId: z.string(),
      minStatus: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]),
    }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("outbound_message"),
    params: z.object({
      relatedTo: z.string().optional(),
      toContains: z.string().optional(),
    }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("workbook_edited"),
    params: z.object({ workbookId: z.string(), afterMinute: z.number().int().nonnegative().optional() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("invoice_disputed"),
    params: z.object({ invoiceId: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("duplicate_flagged"),
    params: z.object({ invoiceId: z.string() }),
  }),
  z.object({
    id: z.string(),
    description: z.string(),
    kind: z.literal("submission_present"),
    params: z.object({}),
  }),
]);

export const ScenarioDefinition = z.object({
  id: z.string().regex(/^([A-C][12]|W[1-6])$/),
  family: z.enum(["purchase_delivery", "invoice_reconciliation", "customer_recovery", "withheld"]),
  version: z.string().min(1),
  title: z.string().min(1),
  brief: z.object({
    role: z.string(),
    company: z.string(),
    situation: z.string(),
    objectives: z.array(z.string()),
    guidance: z.array(z.string()),
  }),
  durationMinutes: z.number().int().positive(),
  policy: z.object({
    approvalThresholdMinor: z.number().int().positive(),
    budgetMinor: z.number().int().positive(),
    currency: z.enum(["CAD", "USD"]),
    helpPolicy: z.object({
      maxHelpRequests: z.number().int().nonnegative(),
      fatalBeyond: z.boolean(),
    }),
  }),
  items: z.array(ItemDef).min(1),
  suppliers: z.array(SupplierDef).min(1),
  initial: z.object({
    purchaseOrders: z.record(z.string(), z.unknown()).optional(),
    deliveries: z.record(z.string(), z.unknown()).optional(),
    invoices: z.record(z.string(), z.unknown()).optional(),
    ledgerOpening: z.object({
      cash: z.number().int(),
      accounts_receivable: z.number().int(),
      inventory: z.number().int(),
      accounts_payable: z.number().int(),
    }),
    tickets: z.record(z.string(), z.unknown()),
    messages: z.array(z.unknown()),
    workbooks: z.record(z.string(), z.unknown()),
    workNotes: z.array(z.unknown()).optional(),
    committedMinor: z.number().int().nonnegative().optional(),
  }),
  scheduledEvents: z.array(ScheduledEventDef),
  requirements: z.object({
    lines: z.array(z.object({ itemId: z.string(), qty: z.number().int().positive() })),
    dueDay: z.number().int().nonnegative(),
    ticketId: z.string().optional(),
  }),
  requirementPredicates: z.array(RequirementPredicate),
  requiredUpdates: z.array(RequiredUpdate),
  publicChecklist: z.array(z.string()),
});

export type ScenarioDefinition = z.infer<typeof ScenarioDefinition>;
export type RequirementPredicateT = z.infer<typeof RequirementPredicate>;
export type RequiredUpdateT = z.infer<typeof RequiredUpdate>;
