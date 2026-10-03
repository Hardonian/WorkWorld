import { describe, it, expect } from "vitest";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { getScenario } from "../src/scenarios/catalog.ts";
import { verifyDomainInvariants } from "../src/domain/invariants.ts";
import type { Action } from "../src/domain/types.ts";

describe("Chaos & Property-Based Mutation Fuzzing (Item 094)", () => {
  it("never corrupts invariants or crashes when bombarded with malformed actions", () => {
    const scenario = getScenario("A1");
    const engine = EpisodeEngine.reset(scenario, { runId: "chaos-run", seed: 42, condition: "agent" });
    const chaoticActions = [
      { type: "draft_purchase_order", supplierId: "NON_EXISTENT", requestedDeliveryDay: -99, lines: [] },
      { type: "draft_purchase_order", supplierId: "VEN-KETTLE", requestedDeliveryDay: 5, lines: [{ itemId: "UNKNOWN", qty: -10 }] },
      { type: "authorize_purchase_order", poId: "PO-FAKE" },
      { type: "check_in_delivery", deliveryId: "DEL-FAKE", receivedLines: [] },
      { type: "dispute_invoice", invoiceId: "INV-FAKE", reason: "price_mismatch" },
      { type: "schedule_payment", invoiceId: "INV-FAKE", payDay: -5 },
      { type: "run_payment_run", payDay: 0, invoiceIds: ["INV-FAKE-1", "INV-FAKE-2"] },
      { type: "update_ticket", ticketId: "TCK-FAKE", status: "closed", note: "x".repeat(500) },
      { type: "advance_time", minutes: -100 },
      { type: "add_work_note", text: "" },
    ] as unknown as Action[];

    // Bombard the engine with random repetitions of chaotic actions
    for (let i = 0; i < 200; i++) {
      const randomAction = chaoticActions[i % chaoticActions.length]!;
      expect(() => {
        engine.step(randomAction, { kind: "agent", id: "chaos-bot", role: "participant" });
      }).not.toThrow();

      // Check invariant verifier on each step
      const inv = verifyDomainInvariants(engine.getState());
      expect(inv.passed).toBe(true);
    }
  });
});
