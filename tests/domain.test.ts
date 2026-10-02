import { describe, it, expect } from "vitest";
import { EpisodeEngine, digestState } from "../src/domain/engine.ts";
import { getScenario } from "../src/scenarios/catalog.ts";
import { ScriptRunner } from "../src/grading/scriptkit.ts";
import type { Action, ActionInput, Actor } from "../src/domain/types.ts";

const ACTOR: Actor = { id: "tester", kind: "human", role: "participant" };

function fresh() {
  return EpisodeEngine.reset(getScenario("A1"), {
    runId: "test-run",
    seed: 1,
    condition: "human",
  });
}

function mk(n: number, payload: ActionInput, rev: number): Action {
  return { ...payload, actionId: `a${n}`, idempotencyKey: `k${n}`, expectedRevision: rev } as Action;
}

describe("action validation and policy", () => {
  it("rejects authorizing above threshold without manager approval", () => {
    const e = fresh();
    e.step(
      mk(1, {
        type: "draft_purchase_order",
        poId: "PO-1",
        supplierId: "SUP-KETTLE",
        lines: [
          { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
          { itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 },
          { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
        ],
        requestedDeliveryDay: 7,
        note: "big order",
      }, 0),
      ACTOR,
    );
    e.step(mk(2, { type: "submit_purchase_order", poId: "PO-1" }, 1), ACTOR);
    const t = e.step(mk(3, { type: "authorize_purchase_order", poId: "PO-1" }, 2), ACTOR);
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("POLICY_AUTH_REQUIRED");
  });

  it("rejects over-budget commitments", () => {
    const e = fresh();
    // 100 cases of gloves from Halbrook = 360000 minor > 250000 budget.
    e.step(
      mk(1, {
        type: "draft_purchase_order",
        poId: "PO-BIG",
        supplierId: "SUP-HALBROOK",
        lines: [{ itemId: "GLV-100", qty: 100, unitPriceMinor: 3600 }],
        requestedDeliveryDay: 7,
        note: "huge",
      }, 0),
      ACTOR,
    );
    e.step(mk(2, { type: "submit_purchase_order", poId: "PO-BIG" }, 1), ACTOR);
    const t = e.step(mk(3, { type: "authorize_purchase_order", poId: "PO-BIG" }, 2), ACTOR);
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("POLICY_BUDGET_EXCEEDED");
  });

  it("rejects manager actions from participant actors", () => {
    const e = fresh();
    e.step(
      mk(1, {
        type: "draft_purchase_order",
        poId: "PO-2",
        supplierId: "SUP-KETTLE",
        lines: [{ itemId: "GLV-100", qty: 1, unitPriceMinor: 3200 }],
        requestedDeliveryDay: 7,
        note: "x",
      }, 0),
      ACTOR,
    );
    const t = e.step(mk(2, { type: "approve_purchase_order", poId: "PO-2" }, 1), ACTOR);
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("PERMISSION_DENIED");
  });

  it("rejects actions on stale revisions without touching state", () => {
    const e = fresh();
    const before = digestState(e.getState());
    const t = e.step(
      mk(1, { type: "add_work_note", text: "hello" }, 999),
      ACTOR,
    );
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("STALE_REVISION");
    expect(digestState(e.getState())).toBe(before);
  });

  it("applies idempotent retries exactly once", () => {
    const e = fresh();
    const action = mk(1, { type: "add_work_note", text: "once" }, 0);
    const t1 = e.step(action, ACTOR);
    expect(t1.ok).toBe(true);
    const notes1 = e.getState().workNotes.length;
    const t2 = e.step({ ...action, expectedRevision: e.getState().revision }, ACTOR);
    expect(t2.ok).toBe(true);
    expect(t2.feedback).toMatch(/Duplicate request/);
    expect(e.getState().workNotes.length).toBe(notes1);
  });

  it("rejects idempotency key reuse with a different payload", () => {
    const e = fresh();
    e.step(mk(1, { type: "add_work_note", text: "first" }, 0), ACTOR);
    const t = e.step(
      mk(1, { type: "add_work_note", text: "different" }, e.getState().revision),
      ACTOR,
    );
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("IDEMPOTENCY_MISMATCH");
  });

  it("rejects invoices before a recorded delivery (temporal validity)", () => {
    const e = fresh();
    e.step(
      mk(1, {
        type: "draft_purchase_order",
        poId: "PO-3",
        supplierId: "SUP-KETTLE",
        lines: [{ itemId: "GLV-100", qty: 1, unitPriceMinor: 3200 }],
        requestedDeliveryDay: 7,
        note: "x",
      }, 0),
      ACTOR,
    );
    e.step(mk(2, { type: "submit_purchase_order", poId: "PO-3" }, 1), ACTOR);
    e.step(mk(3, { type: "authorize_purchase_order", poId: "PO-3" }, 2), ACTOR);
    const t = e.step(
      mk(4, {
        type: "receive_invoice",
        invoiceId: "INV-X",
        invoiceNumber: "X-1",
        supplierId: "SUP-KETTLE",
        poId: "PO-3",
        lines: [{ itemId: "GLV-100", qty: 1, unitPriceMinor: 3200 }],
        amountMinor: 3200,
        currency: "CAD",
        dueDay: 20,
      }, 3),
      ACTOR,
    );
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("POLICY_TEMPORAL_INVALID");
  });

  it("rejects delivery verification that does not match the carrier record", () => {
    const s = new ScriptRunner(getScenario("A1"), "mismatch");
    s.must({ type: "add_work_note", text: "start" });
    s.must({
      type: "draft_purchase_order",
      poId: "PO-M",
      supplierId: "SUP-KETTLE",
      lines: [{ itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 }],
      requestedDeliveryDay: 7,
      note: "x",
    });
    s.must({ type: "submit_purchase_order", poId: "PO-M" });
    s.must({ type: "request_approval", poId: "PO-M" });
    s.must({ type: "advance_time", minutes: 1440 });
    s.must({ type: "authorize_purchase_order", poId: "PO-M" });
    s.must({ type: "advance_time", minutes: 4320 });
    const t = s.step({
      type: "record_delivery",
      deliveryId: "DV:PO-M",
      verifiedLines: [{ itemId: "GLV-100", qty: 99 }],
      note: "inflated",
    });
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("DELIVERY_MISMATCH");
  });

  it("rejects settling the same invoice twice", () => {
    const s = new ScriptRunner(getScenario("B1"), "dup");
    s.must({ type: "advance_time", minutes: 4320 }); // delivery + invoice
    s.must({
      type: "record_delivery",
      deliveryId: "DV-889",
      verifiedLines: [
        { itemId: "FST-550", qty: 6 },
        { itemId: "CLN-080", qty: 2 },
      ],
      note: "ok",
    });
    s.must({ type: "match_invoice", invoiceId: "INV-2041", poId: "PO-2230", deliveryId: "DV-889" });
    s.must({ type: "approve_invoice", invoiceId: "INV-2041", adjustedAmountMinor: null, note: "ok" });
    s.must({ type: "schedule_payment", invoiceId: "INV-2041", payDay: 10 });
    s.must({ type: "run_payment_run", payDay: 10, invoiceIds: ["INV-2041"] });
    const t = s.step({ type: "run_payment_run", payDay: 11, invoiceIds: ["INV-2041"] });
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("POLICY_DUPLICATE_SETTLEMENT");
  });

  it("rejects approving above delivered value (P5)", () => {
    const s = new ScriptRunner(getScenario("B2"), "over");
    s.must({ type: "advance_time", minutes: 4320 }); // DV-892 + INV-2043
    s.must({
      type: "record_delivery",
      deliveryId: "DV-892",
      verifiedLines: [{ itemId: "GLV-100", qty: 6 }],
      note: "short",
    });
    s.must({ type: "match_invoice", invoiceId: "INV-2043", poId: "PO-2230", deliveryId: "DV-892" });
    const t = s.step({
      type: "approve_invoice",
      invoiceId: "INV-2043",
      adjustedAmountMinor: 23600,
      note: "paying billed 8",
    });
    expect(t.ok).toBe(false);
    expect(t.errors[0]!.code).toBe("OVER_ACCRUAL");
  });
});

describe("ledger invariants", () => {
  it("keeps every transaction balanced and balances reconstructible", () => {
    const s = new ScriptRunner(getScenario("B1"), "ledger");
    s.must({ type: "advance_time", minutes: 4320 });
    s.must({
      type: "record_delivery",
      deliveryId: "DV-889",
      verifiedLines: [
        { itemId: "FST-550", qty: 6 },
        { itemId: "CLN-080", qty: 2 },
      ],
      note: "ok",
    });
    s.must({ type: "match_invoice", invoiceId: "INV-2041", poId: "PO-2230", deliveryId: "DV-889" });
    s.must({ type: "approve_invoice", invoiceId: "INV-2041", adjustedAmountMinor: null, note: "ok" });
    s.must({ type: "schedule_payment", invoiceId: "INV-2041", payDay: 10 });
    s.must({ type: "run_payment_run", payDay: 10, invoiceIds: ["INV-2041"] });
    const state = s.engine.getState();
    for (const txn of state.ledger.txns) {
      const debits = txn.entries.reduce((a, e) => a + e.debitMinor, 0);
      const credits = txn.entries.reduce((a, e) => a + e.creditMinor, 0);
      expect(debits).toBe(credits);
    }
    // accrual 19700 + settlement 19700 exactly once each
    expect(state.ledger.txns.filter((t) => t.sourceType === "delivery_accrual")).toHaveLength(1);
    expect(state.ledger.txns.filter((t) => t.sourceType === "settlement")).toHaveLength(1);
  });
});

describe("checkpoint, restore, replay", () => {
  it("restores an identical state from a checkpoint and rejects corrupt ones", () => {
    const s = new ScriptRunner(getScenario("A1"), "cp");
    s.must({ type: "add_work_note", text: "before checkpoint" });
    const cp = s.engine.checkpoint();
    s.must({ type: "add_work_note", text: "after checkpoint" });
    expect(s.engine.getState().workNotes).toHaveLength(2);
    s.engine.restore(cp);
    expect(s.engine.getState().workNotes).toHaveLength(1);
    // corrupt checkpoint: mutate state but keep the old digest
    const corrupt = { ...cp, state: { ...cp.state, revision: cp.state.revision + 5 } };
    expect(() => s.engine.restore(corrupt)).toThrow(/digest mismatch/);
  });

  it("replays an action log to the same state digest", () => {
    const s = new ScriptRunner(getScenario("A1"), "replay");
    s.must({
      type: "draft_purchase_order",
      poId: "PO-R",
      supplierId: "SUP-KETTLE",
      lines: [{ itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 }],
      requestedDeliveryDay: 7,
      note: "x",
    });
    s.must({ type: "add_work_note", text: "note" });
    const state = s.engine.getState();
    const { engine } = EpisodeEngine.replay(getScenario("A1"), {
      runId: state.runId,
      seed: state.seed,
      condition: state.condition,
    }, s.log);
    expect(engine.stateDigest()).toBe(s.engine.stateDigest());
  });
});

describe("logical time and scheduled events", () => {
  it("does not advance logical time while the human pauses", () => {
    const e = fresh();
    const before = e.getState().clockMinute;
    // Pausing = doing nothing. Observing does not move the clock.
    e.observe();
    e.observe();
    expect(e.getState().clockMinute).toBe(before);
  });

  it("fires scheduled events in order when time advances", () => {
    const e = EpisodeEngine.reset(getScenario("A2"), { runId: "sched", seed: 1, condition: "human" });
    e.step(mk(1, { type: "advance_time", minutes: 2880 }, 0), ACTOR);
    const state = e.getState();
    // delay message fired and structurally moved the delivery schedule
    expect(state.purchaseOrders["PO-2210"]!.requestedDeliveryDay).toBe(9);
    expect(state.messages.some((m) => m.from === "Marwell Safety Supply")).toBe(true);
  });
});
