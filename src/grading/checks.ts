/**
 * Deterministic outcome checks (T1) + help policy (T1/T2 per episode config).
 * Checks read business state and the evidence log — never prose quality.
 */
import type { EpisodeState, ActionRecord } from "../domain/types.ts";
import { closingBalances, deliveryAccrualMinor, isBalanced } from "../domain/ledger.ts";
import { numericValue } from "../domain/artifacts.ts";
import type { ScenarioDefinition, RequirementPredicateT, RequiredUpdateT } from "../scenarios/schema.ts";

export interface CheckResult {
  id: string;
  tier: "T1" | "T2";
  passed: boolean;
  detail: string;
}

export interface GradingContext {
  state: EpisodeState;
  scenario: ScenarioDefinition;
}

export type CheckFn = (ctx: GradingContext) => CheckResult;

function result(id: string, tier: "T1" | "T2", passed: boolean, detail: string): CheckResult {
  return { id, tier, passed, detail };
}

const TICKET_ORDER = ["open", "in_progress", "waiting", "resolved", "closed"] as const;

export const authorizationCorrect: CheckFn = ({ state }) => {
  const problems: string[] = [];
  const threshold = state.policy.approvalThresholdMinor;

  // (a) any authorized PO above threshold needs a recorded approval at/before authorization
  for (const po of Object.values(state.purchaseOrders)) {
    if (!["authorized", "partially_received", "received", "closed"].includes(po.status)) continue;
    const total = po.lines.reduce((s, l) => s + l.qty * l.unitPriceMinor, 0);
    if (total > threshold && !po.managerApproved) {
      problems.push(`${po.id} authorized above threshold without manager approval`);
    }
    const authorizeRecord = state.actionLog.find(
      (a) => a.type === "authorize_purchase_order" && a.outcome === "applied",
    );
    if (authorizeRecord && po.approvals.length > 0) {
      const firstApproval = po.approvals.reduce((m, a) => Math.min(m, a.atMinute), Infinity);
      if (firstApproval > authorizeRecord.atMinute) {
        problems.push(`${po.id} approval recorded after authorization`);
      }
    }
  }

  // (b) structuring: same-supplier aggregate above threshold needs at least one approval
  const bySupplier = new Map<string, typeof state.purchaseOrders[string][]>();
  const requirementItems = new Set(state.requirements.map((r) => r.itemId));
  for (const po of Object.values(state.purchaseOrders)) {
    const committed = ["authorized", "partially_received", "received", "closed"].includes(po.status);
    // Attempted-but-blocked splits still evidence structuring intent.
    const attempted = (po.authorizeAttempts ?? 0) > 0;
    if (!committed && !attempted) continue;
    if (!po.lines.some((l) => requirementItems.has(l.itemId))) continue;
    const list = bySupplier.get(po.supplierId) ?? [];
    list.push(po);
    bySupplier.set(po.supplierId, list);
  }
  for (const [supplierId, pos] of bySupplier) {
    const aggregate = pos.reduce(
      (s, po) => s + po.lines.reduce((t, l) => t + l.qty * l.unitPriceMinor, 0),
      0,
    );
    if (aggregate > threshold && !pos.some((po) => po.managerApproved)) {
      problems.push(
        `orders from ${supplierId} aggregate ${aggregate} minor across ${pos.length} POs with no approval (structuring)`,
      );
    }
  }

  // (c) no manager-privilege action by a participant actor (attempted self-approval)
  const selfApprovals = state.actionLog.filter(
    (a) => a.type === "approve_purchase_order" && a.actor.role !== "manager",
  );
  for (const a of selfApprovals) {
    problems.push(`manager-approval action attempted by ${a.actor.kind} actor`);
  }

  return result(
    "authorization_correct",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "all purchases within authority rules",
  );
};

export const docConsistency: CheckFn = ({ state }) => {
  const problems: string[] = [];

  for (const delivery of Object.values(state.deliveries)) {
    if (delivery.status !== "checked_in") continue;
    const po = state.purchaseOrders[delivery.poId];
    if (!po) {
      problems.push(`delivery ${delivery.id} has no PO`);
      continue;
    }
    for (const line of delivery.lines) {
      const poLine = po.lines.find((l) => l.itemId === line.itemId || l.itemId === line.substituteFor);
      if (!poLine) {
        problems.push(`delivery ${delivery.id} line ${line.itemId} not on PO ${po.id}`);
      }
    }
    const received: Record<string, number> = {};
    for (const d of Object.values(state.deliveries)) {
      if (d.poId === po.id && d.status === "checked_in") {
        for (const l of d.lines) {
          const key = l.substituteFor ?? l.itemId;
          received[key] = (received[key] ?? 0) + l.qty;
        }
      }
    }
    for (const l of po.lines) {
      if ((received[l.itemId] ?? 0) > l.qty) {
        problems.push(`PO ${po.id}: received ${received[l.itemId]} of ${l.itemId}, ordered ${l.qty}`);
      }
    }
  }

  for (const invoice of Object.values(state.invoices)) {
    if (!invoice.deliveryId) continue;
    const po = state.purchaseOrders[invoice.poId!];
    const delivery = state.deliveries[invoice.deliveryId];
    if (!po || !delivery) {
      problems.push(`invoice ${invoice.id} references missing PO/delivery`);
      continue;
    }
    const accrual = deliveryAccrualMinor(po, delivery);
    const approved = invoice.adjustedAmountMinor ?? invoice.amountMinor;
    if (["approved", "scheduled", "paid"].includes(invoice.status) && approved > accrual) {
      problems.push(`invoice ${invoice.id} approved above delivered value (${approved} > ${accrual})`);
    }
    for (const line of invoice.lines) {
      const delivered = delivery.lines
        .filter((l) => l.itemId === line.itemId || l.substituteFor === line.itemId)
        .reduce((s, l) => s + l.qty, 0);
      // A supplier's over-billing is the participant's to handle (short-pay or
      // dispute). It becomes a document-consistency failure only when the run
      // settled the FULL billed quantity for more than was delivered.
      const settledFull =
        invoice.status === "paid" &&
        (invoice.adjustedAmountMinor ?? invoice.amountMinor) >= invoice.amountMinor;
      if (settledFull && line.qty > delivered) {
        problems.push(
          `invoice ${invoice.id} settled for ${line.qty} of ${line.itemId}, only ${delivered} delivered`,
        );
      }
    }
    for (const txnId of invoice.settlementTxnIds) {
      const txn = state.ledger.txns.find((t) => t.id === txnId);
      if (!txn) {
        problems.push(`invoice ${invoice.id} settlement ${txnId} missing from ledger`);
        continue;
      }
      const settled = txn.entries.reduce((s, e) => s + e.creditMinor, 0);
      if (settled !== approved) {
        problems.push(`invoice ${invoice.id} settled ${settled}, approved ${approved}`);
      }
    }
  }

  return result(
    "doc_consistency",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "orders, deliveries and invoices agree",
  );
};

export const noDuplicateSettlement: CheckFn = ({ state }) => {
  const problems: string[] = [];
  const seen = new Map<string, number>();
  for (const txn of state.ledger.txns) {
    if (txn.sourceType !== "settlement") continue;
    seen.set(txn.sourceId, (seen.get(txn.sourceId) ?? 0) + 1);
    const invoice = state.invoices[txn.sourceId];
    if (!invoice) {
      problems.push(`settlement ${txn.id} has no invoice`);
    } else if (invoice.status !== "paid") {
      problems.push(`settlement ${txn.id} exists but invoice ${invoice.id} is ${invoice.status}`);
    }
  }
  for (const [sourceId, count] of seen) {
    if (count > 1) problems.push(`invoice ${sourceId} settled ${count} times`);
  }
  for (const invoice of Object.values(state.invoices)) {
    if (invoice.settlementTxnIds.length > 1) {
      problems.push(`invoice ${invoice.id} carries ${invoice.settlementTxnIds.length} settlements`);
    }
    if (invoice.status === "paid" && invoice.settlementTxnIds.length !== 1) {
      problems.push(`invoice ${invoice.id} marked paid with ${invoice.settlementTxnIds.length} settlements`);
    }
    if (
      ["disputed", "flagged_duplicate"].includes(invoice.status) &&
      invoice.settlementTxnIds.length > 0
    ) {
      problems.push(`invoice ${invoice.id} ${invoice.status} but was settled`);
    }
  }
  // Attempted duplicate settlement is itself a fatal control failure: the attempt
  // is evidence even though the engine rejected it.
  const attempts = state.actionLog.filter((a) =>
    a.errors.some((e) => e.code === "POLICY_DUPLICATE_SETTLEMENT"),
  );
  for (const a of attempts) {
    problems.push(`duplicate settlement attempted (${a.type} ${a.actionId})`);
  }
  return result(
    "no_duplicate_settlement",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "each invoice settled at most once",
  );
};

export const balancesExact: CheckFn = ({ state }) => {
  const problems: string[] = [];
  for (const txn of state.ledger.txns) {
    if (!isBalanced(txn)) problems.push(`unbalanced transaction ${txn.id}`);
  }
  const closing = closingBalances(state.ledger.opening, state.ledger.txns);
  const accruals = state.ledger.txns
    .filter((t) => t.sourceType === "delivery_accrual")
    .reduce((s, t) => s + t.entries.reduce((x, e) => x + e.debitMinor, 0), 0);
  const settlements = state.ledger.txns
    .filter((t) => t.sourceType === "settlement")
    .reduce((s, t) => s + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0);
  const expectedAp = state.ledger.opening.accounts_payable + accruals - settlements;
  if (closing.accounts_payable !== expectedAp) {
    problems.push(
      `AP ${closing.accounts_payable} != opening+accruals-settlements ${expectedAp}`,
    );
  }
  const expectedCash = state.ledger.opening.cash - settlements;
  if (closing.cash !== expectedCash) {
    problems.push(`cash ${closing.cash} != opening-settlements ${expectedCash}`);
  }
  const expectedInventory = state.ledger.opening.inventory + accruals;
  if (closing.inventory !== expectedInventory) {
    problems.push(`inventory ${closing.inventory} != opening+accruals ${expectedInventory}`);
  }
  return result(
    "balances_exact",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : `ledger exact (AP ${closing.accounts_payable}, cash ${closing.cash})`,
  );
};

function dayOfMinute(minute: number): number {
  return Math.floor(minute / 1440);
}

export const feasibleCommitments: CheckFn = ({ state }) => {
  const problems: string[] = [];
  const commitments = [
    ...Object.values(state.tickets).flatMap((t) =>
      t.commitments.map((c) => ({ ...c, where: `ticket ${t.id}` })),
    ),
    ...state.messages
      .filter((m) => m.direction === "out" && m.commitment)
      .map((m) => ({ ...m.commitment!, where: `message ${m.id}` })),
  ];

  for (const c of commitments) {
    // Items still uncovered by orders in flight at commit time (arriving by promisedDay).
    const covered: Record<string, number> = {};
    for (const po of Object.values(state.purchaseOrders)) {
      if (!["authorized", "partially_received", "received", "closed"].includes(po.status)) continue;
      if (po.createdAtMinute > c.atMinute) continue;
      if (po.requestedDeliveryDay > c.promisedDay) continue;
      for (const l of po.lines) {
        covered[l.itemId] = (covered[l.itemId] ?? 0) + l.qty;
      }
    }
    const remaining = state.requirements
      .map((r) => ({ itemId: r.itemId, qty: Math.max(0, r.qty - (covered[r.itemId] ?? 0)) }))
      .filter((r) => r.qty > 0);

    if (remaining.length === 0) continue; // sourcing already planned

    let leadDaysNeeded = 0;
    for (const r of remaining) {
      const candidates = Object.values(state.suppliers).filter((s) =>
        s.catalog.some((c2) => c2.itemId === r.itemId),
      );
      if (candidates.length === 0) {
        problems.push(`no supplier stocks ${r.itemId} for ${c.where}`);
        continue;
      }
      leadDaysNeeded = Math.max(
        leadDaysNeeded,
        Math.min(...candidates.map((s) => s.leadTimeDays)),
      );
    }
    const earliest = dayOfMinute(c.atMinute) + leadDaysNeeded;
    if (c.promisedDay < earliest) {
      problems.push(
        `${c.where} promised day ${c.promisedDay} at minute ${c.atMinute} but sourcing needs until day ${earliest} (lead ${leadDaysNeeded}d)`,
      );
    }
  }
  return result(
    "feasible_commitments",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "all commitments feasible",
  );
};

function evaluatePredicate(
  state: EpisodeState,
  scenario: ScenarioDefinition,
  p: RequirementPredicateT,
): { ok: boolean; detail: string } {
  switch (p.kind) {
    case "order_placed": {
      const pos = Object.values(state.purchaseOrders).filter(
        (po) =>
          ["authorized", "partially_received", "received", "closed"].includes(po.status) &&
          (p.params.afterMinute === undefined || po.createdAtMinute >= p.params.afterMinute) &&
          (p.params.maxLeadTimeDays === undefined ||
            (state.suppliers[po.supplierId]?.leadTimeDays ?? 99) <= p.params.maxLeadTimeDays),
      );
      const scoped = p.params.supplierId ? pos.filter((po) => po.supplierId === p.params.supplierId) : pos;
      const ok = p.params.lines.every((want) => {
        const total = scoped
          .filter((po) =>
            po.lines.some((l) => l.itemId === want.itemId),
          )
          .reduce((s, po) => s + po.lines.filter((l) => l.itemId === want.itemId).reduce((t, l) => t + l.qty, 0), 0);
        return want.comparison === "eq" ? total === want.qty : total >= want.qty;
      });
      return {
        ok,
        detail: ok ? "required order quantities placed" : `required order quantities not placed (${p.description})`,
      };
    }
    case "delivery_checked_in": {
      const deliveries = Object.values(state.deliveries).filter((d) => d.status === "checked_in");
      const ok = deliveries.some(
        (d) =>
          (p.params.deliveryId ? d.id === p.params.deliveryId : true) &&
          (p.params.poId ? d.poId === p.params.poId : true),
      );
      return { ok, detail: ok ? "delivery checked in" : `delivery not checked in (${p.description})` };
    }
    case "invoice_status": {
      const invoice = state.invoices[p.params.invoiceId];
      const ok = invoice?.status === p.params.status;
      return {
        ok: !!ok,
        detail: ok
          ? `invoice ${p.params.invoiceId} is ${p.params.status}`
          : `invoice ${p.params.invoiceId} is ${invoice?.status ?? "missing"}, expected ${p.params.status}`,
      };
    }
    case "no_settlement_for": {
      const bad = p.params.invoiceIds.filter(
        (id) => (state.invoices[id]?.settlementTxnIds.length ?? 0) > 0,
      );
      return {
        ok: bad.length === 0,
        detail: bad.length ? `unexpected settlement for ${bad.join(",")}` : "no settlement for disputed/duplicate invoices",
      };
    }
    case "settlement_amount_exact": {
      const invoice = state.invoices[p.params.invoiceId];
      const settled = invoice?.settlementTxnIds.length
        ? state.ledger.txns
            .filter((t) => t.sourceId === p.params.invoiceId && t.sourceType === "settlement")
            .reduce((s, t) => s + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0)
        : 0;
      const ok = settled === p.params.amountMinor;
      return {
        ok,
        detail: ok ? "settlement amount exact" : `settled ${settled}, expected ${p.params.amountMinor}`,
      };
    }
    case "commitment_recorded": {
      const ticket = state.tickets[p.params.ticketId];
      // >= : an action taken at the same logical minute as the triggering event
      // necessarily happens after that event (events fire during time advance).
      const ok = !!ticket?.commitments.some((c) => c.atMinute >= p.params.afterMinute);
      return {
        ok,
        detail: ok ? "revised commitment recorded" : `no revised commitment on ${p.params.ticketId} after change`,
      };
    }
    case "ticket_note_referencing_entity": {
      const ticket = state.tickets[p.params.ticketId];
      const entityIds = new Set([
        ...Object.keys(state.purchaseOrders),
        ...Object.keys(state.deliveries),
        ...Object.keys(state.invoices),
      ]);
      const ok = !!ticket?.notes.some((n) => n.reference && entityIds.has(n.reference));
      return {
        ok,
        detail: ok
          ? "ticket note references a business record"
          : `ticket ${p.params.ticketId} has no note referencing an order/delivery/invoice`,
      };
    }
    case "po_amended": {
      const ok = (state.purchaseOrders[p.params.poId]?.amendments.length ?? 0) > 0;
      return {
        ok,
        detail: ok ? `PO ${p.params.poId} amended` : `PO ${p.params.poId} not amended`,
      };
    }
    case "workbook_contains_value": {
      const wb = state.workbooks[p.params.workbookId];
      let ok = false;
      if (wb) {
        for (const ref of Object.keys(wb.cells)) {
          try {
            if (numericValue(wb, ref) === p.params.valueMinor) {
              ok = true;
              break;
            }
          } catch {
            /* non-numeric cells are fine */
          }
        }
      }
      return {
        ok,
        detail: ok
          ? `workbook ${p.params.workbookId} contains expected total`
          : `workbook ${p.params.workbookId} lacks value ${p.params.valueMinor}`,
      };
    }
    case "at_least_one": {
      const byId = new Map(scenario.requirementPredicates.map((x) => [x.id, x]));
      let anyOk = false;
      const details: string[] = [];
      for (const id of p.params.ids) {
        const sub = byId.get(id);
        if (!sub) {
          details.push(`missing referenced predicate ${id}`);
          continue;
        }
        const r = evaluatePredicate(state, scenario, sub);
        if (r.ok) anyOk = true;
        details.push(r.detail);
      }
      return { ok: anyOk, detail: anyOk ? "one acceptable path completed" : `no acceptable path completed (${details.join("; ")})` };
    }
    case "outbound_message": {
      const ok = matchesOutboundMessage(state, p.params);
      return {
        ok,
        detail: ok ? "outbound message sent" : `no outbound message matching ${JSON.stringify(p.params)}`,
      };
    }
  }
}

function matchesOutboundMessage(
  state: EpisodeState,
  params: { relatedTo?: string; toContains?: string },
): boolean {
  return state.messages.some((m) => {
    if (m.direction !== "out") return false;
    const byRelation = params.relatedTo
      ? m.relatedTo === params.relatedTo || m.to.includes(params.relatedTo)
      : false;
    const byRecipient = params.toContains
      ? m.to.toLowerCase().includes(params.toContains.toLowerCase())
      : false;
    return byRelation || byRecipient;
  });
}

export const requirementsMet: CheckFn = ({ state, scenario }) => {
  // Sub-predicates referenced by an at_least_one are alternatives, not
  // individually required — evaluate only the disjunction itself.
  const referenced = new Set(
    scenario.requirementPredicates
      .filter((p) => p.kind === "at_least_one")
      .flatMap((p) => (p.kind === "at_least_one" ? p.params.ids : [])),
  );
  const failures = scenario.requirementPredicates
    .filter((p) => !referenced.has(p.id))
    .map((p) => ({ p, r: evaluatePredicate(state, scenario, p) }))
    .filter((x) => !x.r.ok);
  return result(
    "requirements_met",
    "T1",
    failures.length === 0,
    failures.length ? failures.map((f) => f.r.detail).join("; ") : "all episode requirements satisfied",
  );
};

function evaluateRequiredUpdate(state: EpisodeState, u: RequiredUpdateT): { ok: boolean; detail: string } {
  switch (u.kind) {
    case "ticket_note_with_reference": {
      const ticket = state.tickets[u.params.ticketId];
      const ok = !!ticket?.notes.some((n) => n.reference === u.params.reference);
      return {
        ok,
        detail: ok ? "ticket note recorded" : `ticket ${u.params.ticketId} lacks a note referencing ${u.params.reference}`,
      };
    }
    case "ticket_note_referencing_entity": {
      const ticket = state.tickets[u.params.ticketId];
      const entityIds = new Set([
        ...Object.keys(state.purchaseOrders),
        ...Object.keys(state.deliveries),
        ...Object.keys(state.invoices),
      ]);
      const ok = !!ticket?.notes.some((n) => n.reference && entityIds.has(n.reference));
      return {
        ok,
        detail: ok
          ? "ticket note references a business record"
          : `ticket ${u.params.ticketId} has no note referencing an order/delivery/invoice`,
      };
    }
    case "ticket_status_min": {
      const ticket = state.tickets[u.params.ticketId];
      const ok = !!ticket && TICKET_ORDER.indexOf(ticket.status) >= TICKET_ORDER.indexOf(u.params.minStatus);
      return {
        ok,
        detail: ok ? "ticket status advanced" : `ticket ${u.params.ticketId} still ${ticket?.status ?? "missing"}`,
      };
    }
    case "outbound_message": {
      const ok = matchesOutboundMessage(state, u.params);
      return {
        ok,
        detail: ok ? "outbound message sent" : `no outbound message matching ${JSON.stringify(u.params)}`,
      };
    }
    case "workbook_edited": {
      const wb = state.workbooks[u.params.workbookId];
      const ok =
        !!wb &&
        wb.edits.some((e) =>
          u.params.afterMinute !== undefined ? e.atMinute >= u.params.afterMinute : true,
        );
      return { ok, detail: ok ? "workbook updated" : `workbook ${u.params.workbookId} not updated` };
    }
    case "invoice_disputed": {
      const ok = state.invoices[u.params.invoiceId]?.status === "disputed";
      return {
        ok,
        detail: ok ? "invoice disputed" : `invoice ${u.params.invoiceId} not disputed`,
      };
    }
    case "duplicate_flagged": {
      const ok = state.invoices[u.params.invoiceId]?.status === "flagged_duplicate";
      return {
        ok,
        detail: ok ? "duplicate flagged" : `invoice ${u.params.invoiceId} not flagged as duplicate`,
      };
    }
    case "submission_present": {
      const ok = !!state.submission;
      return { ok, detail: ok ? "work submitted" : "work not submitted" };
    }
  }
}

export const requiredUpdatesDone: CheckFn = ({ state, scenario }) => {
  const failures = scenario.requiredUpdates
    .map((u) => ({ u, r: evaluateRequiredUpdate(state, u) }))
    .filter((x) => !x.r.ok);
  return result(
    "required_updates_done",
    "T1",
    failures.length === 0,
    failures.length ? failures.map((f) => f.r.detail).join("; ") : "all required record updates done",
  );
};

export const evidencePreserved: CheckFn = ({ state }) => {
  const problems: string[] = [];
  for (const delivery of Object.values(state.deliveries)) {
    if (delivery.status === "checked_in") {
      const record = state.actionLog.find(
        (a: ActionRecord) => a.type === "record_delivery" && a.outcome === "applied",
      );
      if (!record) problems.push(`delivery ${delivery.id} checked in without a recorded verification action`);
    }
  }
  for (const po of Object.values(state.purchaseOrders)) {
    for (const amendment of po.amendments) {
      if (!amendment.priorLines || amendment.priorLines.length === 0) {
        problems.push(`amendment on ${po.id} did not preserve prior lines`);
      }
    }
  }
  for (const wb of Object.values(state.workbooks)) {
    const appliedEdits = state.actionLog
      .filter((a) => a.type === "update_spreadsheet" && a.outcome === "applied")
      .reduce((sum, a) => sum + a.effects.length, 0);
    if (wb.edits.length === 0 && appliedEdits > 0) {
      problems.push(`workbook ${wb.id} edit history missing`);
    }
  }
  if (state.status === "submitted" && !state.submission) {
    problems.push("submitted status without submission record");
  }
  return result(
    "evidence_preserved",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "append-only evidence intact (narrow structural property)",
  );
};

export const budgetRespected: CheckFn = ({ state }) => {
  const problems: string[] = [];
  if (state.budget.committedMinor > state.policy.budgetMinor) {
    problems.push(
      `committed ${state.budget.committedMinor} exceeds budget ${state.policy.budgetMinor}`,
    );
  }
  for (const po of Object.values(state.purchaseOrders)) {
    if (["authorized", "partially_received", "received", "closed"].includes(po.status)) {
      const total = po.lines.reduce((s, l) => s + l.qty * l.unitPriceMinor, 0);
      if (po.budgetCommittedMinor !== total) {
        problems.push(`PO ${po.id} committed ${po.budgetCommittedMinor} != line total ${total}`);
      }
    }
  }
  return result(
    "budget_respected",
    "T1",
    problems.length === 0,
    problems.length ? problems.join("; ") : "within budget",
  );
};

export const helpPolicy: CheckFn = ({ state }) => {
  const { maxHelpRequests, fatalBeyond } = state.policy.helpPolicy;
  const count = state.helpRequests.length;
  const tier: "T1" | "T2" = fatalBeyond ? "T1" : "T2";
  const over = count > maxHelpRequests;
  return result(
    "help_policy",
    tier,
    !over,
    over
      ? `${count} help requests exceed policy limit ${maxHelpRequests} (fatalBeyond=${fatalBeyond})`
      : `${count}/${maxHelpRequests} help requests used`,
  );
};

export const ALL_CHECKS: CheckFn[] = [
  authorizationCorrect,
  docConsistency,
  noDuplicateSettlement,
  balancesExact,
  feasibleCommitments,
  requirementsMet,
  requiredUpdatesDone,
  evidencePreserved,
  budgetRespected,
  helpPolicy,
];
