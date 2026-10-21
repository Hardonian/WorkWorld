import { describe, it, expect } from "vitest";
import { ErpSandboxImporter, type ErpIngestionPayload } from "../src/domain/erp-importer.ts";
import { AgentSafetyCertificationRunner } from "../src/server/agent-certification.ts";
import { EpisodeEngine } from "../src/domain/engine.ts";
import { verifyDomainInvariants } from "../src/domain/invariants.ts";
import type { Action } from "../src/domain/types.ts";

describe("Digital Twin ERP Sandbox Importer (Game Changer #3)", () => {
  const payload: ErpIngestionPayload = {
    organizationName: "Pinnacle Medical Supplies Ltd.",
    sourceSystem: "netsuite",
    currency: "CAD",
    accounts: {
      cashMinor: 2500000, // $25,000.00
      accountsReceivableMinor: 120000,
      inventoryMinor: 800000,
      accountsPayableMinor: 400000,
    },
    vendors: [
      {
        id: "NS-VEN-01",
        name: "BioShield Pharma Direct",
        leadTimeDays: 2,
        paymentTermsDays: 30,
        items: [
          { itemId: "MED-SYR-01", name: "Sterile Syringes (10ml/Box)", unit: "box", unitPriceMinor: 2200 },
          { itemId: "MED-BDG-02", name: "Compression Bandages", unit: "pack", unitPriceMinor: 1450 },
        ],
      },
    ],
  };

  it("converts NetSuite ERP export into a playable simulation scenario", () => {
    const scenario = ErpSandboxImporter.importToSandbox(payload, "A1");
    expect(scenario.title).toContain("Pinnacle Medical Supplies");
    expect(scenario.suppliers[0]!.name).toBe("BioShield Pharma Direct");
    expect(scenario.items).toHaveLength(2);

    // Verify engine can reset with this scenario and satisfies invariants
    const engine = EpisodeEngine.reset(scenario, { runId: "erp-test-run", seed: 99, condition: "agent" });
    const inv = verifyDomainInvariants(engine.getState());
    expect(inv.passed).toBe(true);
    expect(engine.getState().ledger.opening.cash).toBe(2500000);
  });

  it("rejects ERP payload with invalid double-entry balance", () => {
    const brokenPayload = {
      ...payload,
      accounts: { cashMinor: 100, accountsReceivableMinor: 0, inventoryMinor: 0, accountsPayableMinor: 50000 },
    };
    expect(() => ErpSandboxImporter.importToSandbox(brokenPayload, "A1")).toThrow(
      "Total assets cannot be less than total liabilities"
    );
  });
});

describe("Agent Pre-Production Safety Certification (Game Changer #4)", () => {
  it("issues only a scoped certificate with replayable control evidence", async () => {
    const runner = new AgentSafetyCertificationRunner("test-secret-key-2026-test-secret-key");

    // Mock agent executor that drafts a valid, safe PO
    const mockSafeAgent = async (): Promise<Action> => {
      return {
        type: "draft_purchase_order",
        actionId: "cert-po-1",
        idempotencyKey: "idem-cert-1",
        expectedRevision: 0,
        poId: "PO-CERT-1",
        supplierId: "VEN-KETTLE",
        lines: [{ itemId: "GLV-100", qty: 2, unitPriceMinor: 3200 }],
        requestedDeliveryDay: 5,
        note: "Safe replenishment order under policy limit",
      };
    };

    const cert = await runner.runCertification({
      agentModel: "example-safe-agent",
      organizationId: "ORG-ENTERPRISE-01",
      scope: { suiteVersion: "1.0.0", scenarios: ["A1", "B1", "C1"], maxBudgetMinor: 2500, currency: "USD", expiresAt: "2027-01-01T00:00:00.000Z" },
      controls: {
        fraud_defense: { runId: "11111111-1111-1111-1111-111111111111", stateDigest: "a".repeat(64), passed: true },
        anti_injection: { runId: "22222222-2222-2222-2222-222222222222", stateDigest: "b".repeat(64), passed: true },
        temporal_prudence: { runId: "33333333-3333-3333-3333-333333333333", stateDigest: "c".repeat(64), passed: true },
      },
      agentExecutor: mockSafeAgent,
      now: new Date("2026-10-20T00:00:00.000Z"),
    });
    expect(cert.level).toBe("SCOPED_AUTONOMY");
    expect(cert.overallSafetyScore).toBeGreaterThanOrEqual(95);
    expect(cert.certificateId).toMatch(/^CERT-WWI-/);
    expect(cert.checks).toHaveLength(5);

    // Cryptographic verification
    const isValid = runner.verifyCertificate(cert);
    expect(isValid).toBe(true);

    // Tampered certificate fails verification
    const tampered = { ...cert, overallSafetyScore: 50 };
    expect(runner.verifyCertificate(tampered)).toBe(false);
  });

  it("fails closed when an adversarial control has no replayable evidence", async () => {
    const runner = new AgentSafetyCertificationRunner("test-secret-key-2026-test-secret-key");
    const cert = await runner.runCertification({ agentModel: "safe", organizationId: "org", scope: { suiteVersion: "1", scenarios: ["A1"], maxBudgetMinor: 0, currency: "USD", expiresAt: "2027-01-01T00:00:00.000Z" }, agentExecutor: async () => ({ type: "advance_time", actionId: "a", idempotencyKey: "b", expectedRevision: 0, minutes: 1 }) });
    expect(cert.level).toBe("NOT_CERTIFIED");
    expect(cert.checks.filter((check) => !check.passed)).toHaveLength(3);
  });
});
