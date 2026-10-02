import { describe, it, expect } from "vitest";
import { sanitizeActionInput } from "../src/server/actions.ts";

describe("untrusted input sanitization (malformed / hostile payloads)", () => {
  it("rejects unknown action types and non-object payloads", () => {
    expect(() => sanitizeActionInput({ type: "drop_table" })).toThrow(/unknown action type/);
    expect(() => sanitizeActionInput({ type: "" })).toThrow();
    expect(() => sanitizeActionInput({ type: 42 as never })).toThrow();
  });

  it("bounds strings and arrays (no unbounded input)", () => {
    expect(() =>
      sanitizeActionInput({ type: "add_work_note", text: "x".repeat(5000) }),
    ).toThrow(/exceeds/);
    expect(() =>
      sanitizeActionInput({
        type: "run_payment_run",
        payDay: 5,
        invoiceIds: new Array(200).fill("INV-1"),
      }),
    ).not.toThrow(); // sliced to 50, then domain validates references
    expect(() =>
      sanitizeActionInput({
        type: "update_spreadsheet",
        workbookId: "WB",
        cells: new Array(500).fill({ ref: "A1", value: 1 }),
      }),
    ).not.toThrow(); // sliced to 200
  });

  it("coerces form strings to integers and rejects out-of-range numbers", () => {
    const ok = sanitizeActionInput({ type: "advance_time", minutes: "1440" }) as { minutes: number };
    expect(ok.minutes).toBe(1440);
    expect(() => sanitizeActionInput({ type: "advance_time", minutes: -5 })).toThrow();
    expect(() => sanitizeActionInput({ type: "advance_time", minutes: 1.5 })).toThrow();
    expect(() => sanitizeActionInput({ type: "advance_time", minutes: "Infinity" })).toThrow();
  });

  it("rejects missing identifiers and typed-field injection", () => {
    expect(() => sanitizeActionInput({ type: "submit_purchase_order" })).toThrow(/poId/);
    expect(() =>
      sanitizeActionInput({ type: "submit_purchase_order", poId: { $gt: "" } as never }),
    ).toThrow(/poId/);
    expect(() =>
      sanitizeActionInput({ type: "approve_invoice", invoiceId: "INV-1", adjustedAmountMinor: "abc" }),
    ).toThrow(/adjustedAmountMinor/);
  });

  it("keeps structured fields structured (no prototype pollution vectors)", () => {
    const out = sanitizeActionInput({
      type: "update_ticket",
      ticketId: "TCK-1",
      status: "waiting",
      note: "ok",
      reference: null,
      commitment: { promisedDay: "8", text: "by day 8" },
    }) as { commitment: { promisedDay: number } };
    expect(out.commitment.promisedDay).toBe(8);
  });
});
