import { describe, it, expect } from "vitest";
import {
  escapeCsvCell,
  exportLedgerToCsv,
  exportWorkbookGridToCsv,
  exportOperationsSnapshotCsv,
} from "../src/domain/export-xlsx.ts";
import { LangChainAgentAdapter, WORKWORLD_LANGCHAIN_TOOL_DEFINITIONS } from "../src/sdk/langchain.ts";
import { POST as batchActionPost } from "../src/app/api/actions/batch/route.ts";
import type { JournalEntry, EpisodeState, Action } from "../src/domain/types.ts";

describe("Universal Data Exporter (Interoperability)", () => {
  it("escapes CSV values and neutralizes Excel formula injection vulnerabilities", () => {
    expect(escapeCsvCell("Standard Text")).toBe("Standard Text");
    expect(escapeCsvCell("Text with, comma")).toBe('"Text with, comma"');
    // Formula injection attempts starting with =, +, -, @ must be prepended with a quote
    expect(escapeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
    expect(escapeCsvCell("+12345")).toBe("'+12345");
    expect(escapeCsvCell("@cmd")).toBe("'@cmd");
  });

  it("exports double-entry journal entries to standard balanced CSV", () => {
    const txns: JournalEntry[] = [
      {
        id: "TXN-01",
        minute: 10,
        debitAccount: "inventory",
        creditAccount: "cash",
        debits: 45000,
        credits: 45000,
        memo: "Purchase 10x GLV-100",
      },
    ];

    const csv = exportLedgerToCsv(txns);
    expect(csv).toContain("Transaction ID,Minute,Description");
    expect(csv).toContain("TXN-01");
    expect(csv).toContain("450.00");
    expect(csv).toContain("inventory");
    expect(csv).toContain("cash");
    expect(csv).toContain("TRUE");
  });

  it("exports workbook grid cells and operations snapshots to CSV", () => {
    const grid = {
      A1: { value: "Item" },
      B1: { value: "Quantity" },
      A2: { value: "GLV-100" },
      B2: { value: 10 },
    };

    const csvGrid = exportWorkbookGridToCsv(grid);
    expect(csvGrid).toContain("Item,Quantity");
    expect(csvGrid).toContain("GLV-100,10");

    const mockState = {
      inventory: { "GLV-100": 15 },
      ledger: { cashMinor: 100000 },
      policy: { budgetMinor: 500000, approvalThresholdMinor: 100000 },
    } as unknown as EpisodeState;

    const snapshotCsv = exportOperationsSnapshotCsv(mockState);
    expect(snapshotCsv).toContain("GLV-100,15");
    expect(snapshotCsv).toContain("Available Cash,$1000.00");
  });
});

describe("LangChain & AI Agent Framework Adapter (Interoperability)", () => {
  it("provides 4 standard tool definitions for LLM function calling", () => {
    expect(WORKWORLD_LANGCHAIN_TOOL_DEFINITIONS).toHaveLength(4);
    const names = WORKWORLD_LANGCHAIN_TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toContain("workworld_observe_state");
    expect(names).toContain("workworld_submit_action");
    expect(names).toContain("workworld_search_catalog");
    expect(names).toContain("workworld_read_artifact");
  });

  it("dispatches tool calls through agent adapter", async () => {
    let receivedAction: Action | null = null;
    const adapter = new LangChainAgentAdapter(async (action) => {
      receivedAction = action;
      return { ok: true, state: "advanced" };
    });

    const res = await adapter.executeToolCall("workworld_submit_action", {
      actionType: "advance_time",
      payload: JSON.stringify({ minutes: 30 }),
    });

    expect(receivedAction).toBeDefined();
    expect((receivedAction as unknown as { type: string }).type).toBe("advance_time");
    expect(res).toContain('"ok":true');
  });
});

describe("High-Throughput Batch Action API Route (Performance)", () => {
  it("rejects batch requests without active session", async () => {
    const req = new Request("http://localhost:3100/api/actions/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: [{ type: "advance_time", minutes: 15 }] }),
    });

    const res = await batchActionPost(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("No active session");
  });
});
