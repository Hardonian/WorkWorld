import { describe, it, expect } from "vitest";
import { MerkleAuditTree } from "../src/domain/merkle-audit.ts";
import { DataLossPreventionScanner } from "../src/server/dlp.ts";
import type { Action } from "../src/domain/types.ts";

describe("Merkle Audit Tree & Tamper-Evident State Sealing (Security)", () => {
  const sampleActions: Action[] = [
    { type: "advance_time", minutes: 15, actionId: "act-1" } as unknown as Action,
    { type: "submit_purchase_order", actionId: "act-2", supplierId: "VEN-APEX", lines: [{ itemId: "GLV-100", qty: 10 }] } as unknown as Action,
    { type: "settle_invoice", actionId: "act-3", invoiceId: "INV-1001", amountMinor: 22000 } as unknown as Action,
    { type: "complete_episode", actionId: "act-4" } as unknown as Action,
  ];

  it("builds a deterministic Merkle root from action sequences", () => {
    const tree1 = new MerkleAuditTree(sampleActions);
    const tree2 = new MerkleAuditTree(sampleActions);

    expect(tree1.getRoot()).toHaveLength(64);
    expect(tree1.getRoot()).toBe(tree2.getRoot());
  });

  it("generates and verifies cryptographic inclusion proofs for audit compliance", () => {
    const tree = new MerkleAuditTree(sampleActions);
    const root = tree.getRoot();

    // Verify inclusion for leaf #1 (action #1)
    const leafHash = MerkleAuditTree.hashAction(sampleActions[1]!, 1);
    const proof = tree.generateProof(1);

    const isValid = MerkleAuditTree.verifyProof(leafHash, proof, root);
    expect(isValid).toBe(true);

    // Tampered leaf hash must fail verification
    const tamperedHash = leafHash.replace(/^[0-9a-f]/, "0");
    const isTamperedValid = MerkleAuditTree.verifyProof(tamperedHash, proof, root);
    expect(isTamperedValid).toBe(false);
  });
});

describe("Data Loss Prevention (DLP) & PII Redaction (Security)", () => {
  it("redacts accidentally pasted live Stripe and AI API keys", () => {
    const sampleStripeKey = ["sk", "live", "51AbCdEfGhIjKlMnOpQrStUvWx"].join("_");
    const sampleAiKey = ["sk", "proj", "1234567890abcdefghijklmnopqrstuvwx"].join("-");
    const raw = `Here is my key: ${sampleStripeKey} and ${sampleAiKey} for billing.`;
    const result = DataLossPreventionScanner.scanAndRedact(raw);

    expect(result.isClean).toBe(false);
    expect(result.redactedText).toContain("[REDACTED_STRIPE_API_KEY]");
    expect(result.redactedText).toContain("[REDACTED_AI_API_KEY]");
    expect(result.redactedText).not.toContain(sampleStripeKey);
    expect(result.redactedText).not.toContain(sampleAiKey);
    expect(result.violationsFound).toHaveLength(2);
  });

  it("redacts valid credit card numbers using Luhn verification while ignoring non-card digit sequences", () => {
    // Valid sample credit card format passing Luhn check
    const ccText = "Payment info: 4111 1111 1111 1111 expiring 12/28";
    const res1 = DataLossPreventionScanner.scanAndRedact(ccText);
    expect(res1.isClean).toBe(false);
    expect(res1.redactedText).toContain("[REDACTED_PAYMENT_CARD]");

    // Arbitrary phone number or PO reference not matching Luhn is preserved
    const phoneText = "Call dispatch at 123-456-7890 or tracking PO-9876543210";
    const res2 = DataLossPreventionScanner.scanAndRedact(phoneText);
    expect(res2.isClean).toBe(true);
    expect(res2.redactedText).toContain("123-456-7890");
  });
});
