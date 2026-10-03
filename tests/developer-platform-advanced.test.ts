import { describe, it, expect } from "vitest";
import { generateApiKey, verifyApiKey } from "../src/server/api-keys.ts";
import { ScenarioBuilder } from "../src/scenarios/dsl.ts";
import { runCli } from "../src/cli/workworld-cli.ts";
import fs from "node:fs";

describe("API Key Management (Item 066)", () => {
  it("generates and verifies scoped developer API keys", () => {
    const { plaintextKey, record } = generateApiKey({
      name: "Research Benchmark Key",
      organizationId: "ORG-AI",
      scopes: ["episodes:read", "actions:write"],
    });

    expect(plaintextKey).toMatch(/^ww_live_[0-9a-f]{8}_[0-9a-f]{48}$/);
    expect(verifyApiKey(plaintextKey, record, "actions:write").valid).toBe(true);
    expect(verifyApiKey(plaintextKey, record, "admin").valid).toBe(false);

    record.isRevoked = true;
    expect(verifyApiKey(plaintextKey, record, "actions:write").valid).toBe(false);
  });
});

describe("Scenario Authoring DSL (Item 070)", () => {
  it("builds a valid custom scenario using fluent builder", () => {
    const scenario = new ScenarioBuilder("CUST-01", "Cold Chain Logistics Crisis")
      .setRole("Cold Chain Coordinator", "Vaccine storage freezer failure")
      .addObjective("Order dry ice containers immediately")
      .setBudget(5000, 1000)
      .addSupplier("VEN-ICE", "Polar Ice Supplies", 1, "due_on_receipt", [
        { itemId: "ICE-DRY", name: "Dry Ice 10kg", unitPriceCad: 45, uom: "block" },
      ])
      .addRubricRule("R_COLD_ORDER", "Must dispatch dry ice order within 2 hours", 100)
      .build();

    expect(scenario.id).toBe("CUST-01");
    expect(scenario.policy.budgetMinor).toBe(500000);
    expect(scenario.supplierCatalog["VEN-ICE"]?.items["ICE-DRY"]?.unitPriceMinor).toBe(4500);
    expect(scenario.rubric?.rules).toHaveLength(1);
  });
});

describe("Developer CLI Tool (Item 068)", () => {
  it("executes CLI commands without throwing", async () => {
    const codeHelp = await runCli(["help"]);
    expect(codeHelp).toBe(0);

    const codeList = await runCli(["list"]);
    expect(codeList).toBe(0);
  });
});

describe("Python SDK (Item 064)", () => {
  it("ships complete Python client package structure", () => {
    expect(fs.existsSync("src/sdk/python/workworld/__init__.py")).toBe(true);
    expect(fs.existsSync("src/sdk/python/workworld/client.py")).toBe(true);
    const content = fs.readFileSync("src/sdk/python/workworld/client.py", "utf8");
    expect(content).toContain("class WorkWorldClient");
  });
});
