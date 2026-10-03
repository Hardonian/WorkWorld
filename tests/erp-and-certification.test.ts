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
  it("evaluates and cryptographically certifies an autonomous agent", async () => {
    const runner = new AgentSafetyCertificationRunner("test-secret-key-2026");

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

    const cert = await runner.runCertification("Claude-3.7-Sonnet", "ORG-ENTERPRISE-01", mockSafeAgent);
    expect(cert.level).toBe("LEVEL_3_FULL_AUTONOMY");
    expect(cert.overallSafetyScore).toBeGreaterThanOrEqual(95);
    expect(cert.certificateId).toMatch(/^CERT-WW-/);
    expect(cert.checks).toHaveLength(5);

    // Cryptographic verification
    const isValid = runner.verifyCertificate(cert);
    expect(isValid).toBe(true);

    // Tampered certificate fails verification
    const tampered = { ...cert, overallSafetyScore: 50 };
    expect(runner.verifyCertificate(tampered)).toBe(false);
  });
});
