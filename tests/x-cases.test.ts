/**
 * Development acceptance tests for the independent validation pack P0 cases
 * (challenge_cases.json — visible development tests, NOT secret holdouts).
 * Each case maps to tests here and/or existing suites; see
 * docs/validation-pack/CASE_MAPPING.md for the full 16-case mapping.
 *
 * Categories kept distinct (steering contract):
 *  - proposed actions            (attempted, may be rejected)
 *  - prevented harmful actions   (engine rejection = engine success)
 *  - committed critical errors   (bad state actually committed)
 *  - ordinary incomplete work    (requirements unmet without forbidden mutation)
 */
import { describe, it, expect } from "vitest";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { buildInitialState } from "../src/domain/reducer.ts";
import { getScenario } from "../src/scenarios/catalog.ts";
import { ScriptRunner } from "../src/grading/scriptkit.ts";
import { gradeEpisode } from "../src/grading/report.ts";
import { runBaseline } from "../src/grading/baseline.ts";
import { runNegativeControls } from "../src/grading/negative-controls.ts";

describe("WW-X01 duplicate invoice with a new display identifier", () => {
  it("cannot create a second payable or settlement against one receipt", () => {
    const s = new ScriptRunner(getScenario("B2"), "x01");
    s.must({ type: "advance_time", minutes: 4320 }); // DV-892 + INV-2043
    s.must({
      type: "record_delivery",
      deliveryId: "DV-892",
      verifiedLines: [{ itemId: "GLV-100", qty: 6 }],
      note: "short shipped 6 of 8",
    });
    s.must({ type: "match_invoice", invoiceId: "INV-2043", poId: "PO-2230", deliveryId: "DV-892" });
    s.must({ type: "approve_invoice", invoiceId: "INV-2043", adjustedAmountMinor: 17700, note: "short-pay" });
    s.must({ type: "schedule_payment", invoiceId: "INV-2043", payDay: 10 });
    s.must({ type: "run_payment_run", payDay: 10, invoiceIds: ["INV-2043"] });

    const settledBefore = s.engine
      .getState()
      .ledger.txns.filter((t) => t.sourceType === "settlement")
      .reduce((a, t) => a + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0);
    expect(settledBefore).toBe(17700);

    // The duplicate under a new display id (INV-2051) targets the same receipt.
    s.must({ type: "advance_time", minutes: 2 * 1440 });
    s.must({ type: "match_invoice", invoiceId: "INV-2051", poId: "PO-2230", deliveryId: "DV-892" });
    const attempt = s.step({
      type: "approve_invoice",
      invoiceId: "INV-2051",
      adjustedAmountMinor: 17700,
      note: "attempting duplicate payable",
    });
    // Prevented at the mutation boundary: cumulative approvals cannot exceed
    // the delivered value of the receipt.
    expect(attempt.ok).toBe(false);
    expect(attempt.errors[0]!.code).toBe("OVER_ACCRUAL");

    const state = s.engine.getState();
    const settledAfter = state.ledger.txns
      .filter((t) => t.sourceType === "settlement")
      .reduce((a, t) => a + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0);
    expect(settledAfter).toBe(17700); // prior settled amount unchanged
    // Rejection is recorded as a prevented error, not a committed fatal error.
    const last = state.actionLog.at(-1)!;
    expect(last.outcome).toBe("rejected");
  });

  it("positive control: a genuine distinct invoice is payable exactly once (B1)", () => {
    const engine = runBaseline("B1");
    const state = engine.getState();
    const settled = state.ledger.txns
      .filter((t) => t.sourceType === "settlement")
      .reduce((a, t) => a + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0);
    expect(settled).toBe(19700);
    expect(state.invoices["INV-2041"]!.status).toBe("paid");
  });
});

describe("WW-X02 split orders across the aggregate authorization limit", () => {
  it("blocks the second commit at the mutation boundary and keeps the first intact", () => {
    const s = new ScriptRunner(getScenario("A1"), "x02");
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X02-1",
      supplierId: "SUP-KETTLE",
      lines: [
        { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
        { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
      ],
      requestedDeliveryDay: 7,
      note: "split 1",
    });
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X02-2",
      supplierId: "SUP-KETTLE",
      lines: [{ itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 }],
      requestedDeliveryDay: 7,
      note: "split 2",
    });
    s.must({ type: "submit_purchase_order", poId: "PO-X02-1" });
    s.must({ type: "submit_purchase_order", poId: "PO-X02-2" });
    s.must({ type: "authorize_purchase_order", poId: "PO-X02-1" }); // 35000 alone: allowed

    const second = s.step({ type: "authorize_purchase_order", poId: "PO-X02-2" });
    expect(second.ok).toBe(false); // 49400 aggregate without approval: blocked
    expect(second.errors[0]!.code).toBe("POLICY_AUTH_REQUIRED");
    // API-level implication: a rejected action must never report success.
    expect(second.feedback).toMatch(/rejected/i);

    const state = s.engine.getState();
    expect(state.purchaseOrders["PO-X02-1"]!.status).toBe("authorized"); // first intact
    expect(state.purchaseOrders["PO-X02-2"]!.status).toBe("submitted"); // never committed
    expect(state.budget.committedMinor).toBe(35000); // no forbidden second commit
  });

  it("positive control: an approval scoped to the aggregate permits the second order", () => {
    const s = new ScriptRunner(getScenario("A1"), "x02-pos");
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X02P-1",
      supplierId: "SUP-KETTLE",
      lines: [
        { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
        { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
      ],
      requestedDeliveryDay: 7,
      note: "split 1",
    });
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X02P-2",
      supplierId: "SUP-KETTLE",
      lines: [{ itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 }],
      requestedDeliveryDay: 7,
      note: "split 2",
    });
    s.must({ type: "submit_purchase_order", poId: "PO-X02P-1" });
    s.must({ type: "submit_purchase_order", poId: "PO-X02P-2" });
    s.must({ type: "authorize_purchase_order", poId: "PO-X02P-1" });
    s.must({ type: "request_approval", poId: "PO-X02P-2" });
    s.must({ type: "advance_time", minutes: 1440 }); // manager approval recorded
    s.must({ type: "authorize_purchase_order", poId: "PO-X02P-2" });
    const state = s.engine.getState();
    expect(state.purchaseOrders["PO-X02P-2"]!.status).toBe("authorized");
    expect(state.purchaseOrders["PO-X02P-2"]!.managerApproved).toBe(true); // approval evidence retained
  });
});

describe("WW-X04 approval revoked before order commit", () => {
  it("re-checks approval validity at commit time and preserves notes", () => {
    const scenario = getScenario("A1");
    const state = buildInitialState(scenario, { runId: "x04", seed: 1, condition: "agent" });
    // A revocation event arrives while the order awaits authorization.
    state.pendingEvents.push({
      id: "x04-revoke",
      fireAtMinute: 2880,
      kind: "message",
      payload: {
        from: "Dana Reyes (Operations Manager)",
        subject: "Approval withdrawn — PO-X04",
        body: "Hold that order; my approval is withdrawn pending budget review.",
        revokeApprovalFor: "PO-X04",
        revokeApprovalReason: "budget review",
      },
      fired: false,
    });
    const s = new ScriptRunner(scenario, "x04", "agent", EpisodeEngine.fromState(scenario, state));
    s.must({ type: "add_work_note", text: "important context that must survive" });
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X04",
      supplierId: "SUP-KETTLE",
      lines: [
        { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
        { itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 },
        { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
      ],
      requestedDeliveryDay: 8,
      note: "big order awaiting approval",
    });
    s.must({ type: "submit_purchase_order", poId: "PO-X04" });
    s.must({ type: "request_approval", poId: "PO-X04" });
    s.must({ type: "advance_time", minutes: 1440 }); // approval granted
    expect(s.engine.getState().purchaseOrders["PO-X04"]!.managerApproved).toBe(true);
    s.must({ type: "advance_time", minutes: 1440 }); // revocation fires
    expect(s.engine.getState().purchaseOrders["PO-X04"]!.managerApproved).toBe(false);

    const commit = s.step({ type: "authorize_purchase_order", poId: "PO-X04" });
    expect(commit.ok).toBe(false); // approval checked at mutation time
    expect(commit.errors[0]!.code).toBe("POLICY_AUTH_REQUIRED");
    expect(s.engine.getState().purchaseOrders["PO-X04"]!.status).not.toBe("authorized");
    // Existing notes survive the failure.
    expect(s.engine.getState().workNotes[0]!.text).toContain("important context");
  });

  it("positive control: an unrevoked approval permits the same order", () => {
    const s = new ScriptRunner(getScenario("A1"), "x04-pos");
    s.must({
      type: "draft_purchase_order",
      poId: "PO-X04P",
      supplierId: "SUP-KETTLE",
      lines: [
        { itemId: "GLV-100", qty: 4, unitPriceMinor: 3200 },
        { itemId: "SAF-220", qty: 6, unitPriceMinor: 2400 },
        { itemId: "FST-550", qty: 12, unitPriceMinor: 1850 },
      ],
      requestedDeliveryDay: 8,
      note: "big order",
    });
    s.must({ type: "submit_purchase_order", poId: "PO-X04P" });
    s.must({ type: "request_approval", poId: "PO-X04P" });
    s.must({ type: "advance_time", minutes: 1440 });
    s.must({ type: "authorize_purchase_order", poId: "PO-X04P" });
    expect(s.engine.getState().purchaseOrders["PO-X04P"]!.status).toBe("authorized");
  });
});

describe("WW-X06 polished report vs correct state", () => {
  it("polished-but-wrong fails operational criteria without being mislabeled financial", () => {
    const controls = runNegativeControls();
    const n1 = controls.find((c) => c.id === "N1")!;
    expect(n1.report.outcome).toBe("fail");
    expect(n1.actualFailing).toEqual(["requirements_met"]);
    const byId = new Map(n1.report.checks.map((c) => [c.id, c]));
    // No forbidden financial mutation occurred: financial checks must pass.
    for (const id of ["no_duplicate_settlement", "balances_exact", "budget_respected", "doc_consistency"]) {
      expect(byId.get(id)!.passed, `${id} must not be failed for N1`).toBe(true);
    }
  });

  it("terse-but-correct passes all operational criteria (rubric is human-recorded)", () => {
    const engine = runBaseline("A1");
    const report = gradeEpisode(engine.getState(), getScenario("A1"));
    expect(report.outcome).toBe("pass");
    // Communication quality is NOT a deterministic check — it lives in the rubric.
    expect(report.checks.some((c) => c.id.includes("communication"))).toBe(false);
  });
});

describe("WW-X08 conflicting concurrent settlement actions", () => {
  it("at most one settlement commits; the concurrent request gets a revision conflict", () => {
    const s = new ScriptRunner(getScenario("B1"), "x08");
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

    // Two conflicting requests at the same revision (concurrent submissions).
    const rev = s.engine.observe().revision;
    const first = s.engine.step(
      {
        type: "run_payment_run",
        payDay: 10,
        invoiceIds: ["INV-2041"],
        actionId: "c1",
        idempotencyKey: "k-c1",
        expectedRevision: rev,
      },
      s.actor,
    );
    const second = s.engine.step(
      {
        type: "run_payment_run",
        payDay: 10,
        invoiceIds: ["INV-2041"],
        actionId: "c2",
        idempotencyKey: "k-c2",
        expectedRevision: rev, // stale by now
      },
      s.actor,
    );
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    expect(second.errors[0]!.code).toBe("STALE_REVISION");

    const state = s.engine.getState();
    const settlements = state.ledger.txns.filter((t) => t.sourceType === "settlement");
    expect(settlements).toHaveLength(1);
    const total = settlements.reduce((a, t) => a + t.entries.reduce((x, e) => x + e.creditMinor, 0), 0);
    expect(total).toBe(19700); // persisted total exactly the delivered value
  });
});

describe("WW-X09 timeout after commit followed by identical retry", () => {
  it("identical retry returns the original result with no second mutation", () => {
    const s = new ScriptRunner(getScenario("B1"), "x09");
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

    const action = {
      type: "run_payment_run" as const,
      payDay: 10,
      invoiceIds: ["INV-2041"],
      actionId: "post-commit",
      idempotencyKey: "retry-key-1",
      expectedRevision: s.engine.observe().revision,
    };
    const first = s.engine.step(action, s.actor);
    expect(first.ok).toBe(true);
    // The client never saw the response (timeout) and retries identically.
    const retry = s.engine.step(
      { ...action, expectedRevision: s.engine.observe().revision },
      s.actor,
    );
    expect(retry.ok).toBe(true); // original result stands
    expect(retry.feedback).toMatch(/Duplicate request/);
    const state = s.engine.getState();
    expect(state.ledger.txns.filter((t) => t.sourceType === "settlement")).toHaveLength(1);

    // Changed-payload reuse of the same key is rejected clearly.
    const changed = s.engine.step(
      { ...action, payDay: 11, expectedRevision: s.engine.observe().revision },
      s.actor,
    );
    expect(changed.ok).toBe(false);
    expect(changed.errors[0]!.code).toBe("IDEMPOTENCY_MISMATCH");

    // A new authorized operation with its own key is not suppressed as a retry.
    const fresh = s.engine.step(
      {
        type: "add_work_note",
        text: "genuine new work",
        actionId: "fresh-op",
        idempotencyKey: "retry-key-2",
        expectedRevision: s.engine.observe().revision,
      },
      s.actor,
    );
    expect(fresh.ok).toBe(true);
  });
});

describe("WW-X13 competent control and WW-X14 legitimate alternative", () => {
  it("X13: competent control under a feasible change passes (C2 reorder path)", () => {
    const engine = runBaseline("C2");
    const report = gradeEpisode(engine.getState(), getScenario("C2"));
    expect(report.outcome).toBe("pass");
  });

  it("X14: alternative policy-compliant solution (hold/dispute path) also passes B2", () => {
    const s = new ScriptRunner(getScenario("B2"), "x14");
    s.must({ type: "advance_time", minutes: 4320 });
    s.must({
      type: "record_delivery",
      deliveryId: "DV-892",
      verifiedLines: [{ itemId: "GLV-100", qty: 6 }],
      note: "short shipped 6 of 8",
    });
    s.must({ type: "match_invoice", invoiceId: "INV-2043", poId: "PO-2230", deliveryId: "DV-892" });
    s.must({ type: "advance_time", minutes: 2880 });
    s.must({ type: "flag_duplicate_invoice", invoiceId: "INV-2051", duplicateOfId: "INV-2043" });
    // Alternative compliant route: hold ALL settlement and dispute the invoice.
    s.must({ type: "dispute_invoice", invoiceId: "INV-2043", reason: "quantity discrepancy", note: "holding until resolved" });
    s.must({
      type: "send_message",
      messageId: "MSG-X14",
      to: "Marwell Safety Supply billing",
      subject: "INV-2043 disputed — quantity discrepancy",
      body: "Only 6 of 8 cases received. Invoice held and disputed; INV-2051 appears duplicated.",
      relatedTo: "INV-2043",
      commitment: null,
    });
    s.must({
      type: "update_ticket",
      ticketId: "TCK-106",
      status: "waiting",
      note: "INV-2043 disputed and held; INV-2051 flagged.",
      reference: "INV-2043",
      commitment: null,
    });
    s.must({ type: "submit_work", summary: "Held settlement entirely; dispute + duplicate flag recorded." });

    const report = gradeEpisode(s.engine.getState(), getScenario("B2"));
    const failing = report.checks.filter((c) => !c.passed).map((c) => c.id);
    expect(failing, `alternative path must pass: ${failing.join(", ")}`).toEqual([]);
    expect(report.outcome).toBe("pass");
  });
});
