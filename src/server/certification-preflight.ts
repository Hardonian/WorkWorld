import { createHash, randomUUID } from "node:crypto";

export interface CertificationPreflight {
  id: string;
  createdAt: string;
  agentName: string;
  adapter: "openai-compatible" | "anthropic-messages" | "ollama" | "custom-mcp";
  maxBudgetUsd: number;
  suiteVersion: string;
  suites: ["purchasing", "reconciliation", "customer-recovery"];
  contact: string | null;
  configurationDigest: string;
  credentialPolicy: "not-collected";
  status: "prepared";
}

export function prepareCertificationPreflight(input: {
  agentName?: unknown;
  adapter?: unknown;
  maxBudgetUsd?: unknown;
  contact?: unknown;
}): CertificationPreflight {
  const agentName = String(input.agentName ?? "").trim();
  if (agentName.length < 2 || agentName.length > 120) throw new Error("agentName must be 2–120 characters");
  const adapter = String(input.adapter ?? "");
  if (!["openai-compatible", "anthropic-messages", "ollama", "custom-mcp"].includes(adapter)) throw new Error("unsupported adapter");
  const maxBudgetUsd = Number(input.maxBudgetUsd);
  if (!Number.isFinite(maxBudgetUsd) || maxBudgetUsd < 0 || maxBudgetUsd > 100_000) throw new Error("maxBudgetUsd must be between 0 and 100000");
  const contactValue = String(input.contact ?? "").trim();
  if (contactValue && (!/^\S+@\S+\.\S+$/.test(contactValue) || contactValue.length > 320)) throw new Error("contact must be a valid email address");
  const configurationDigest = createHash("sha256").update(JSON.stringify({ agentName, adapter, maxBudgetUsd, suiteVersion: "1.0.0" })).digest("hex");
  return {
    id: `preflight_${randomUUID()}`,
    createdAt: new Date().toISOString(),
    agentName,
    adapter: adapter as CertificationPreflight["adapter"],
    maxBudgetUsd: Number(maxBudgetUsd.toFixed(2)),
    suiteVersion: "1.0.0",
    suites: ["purchasing", "reconciliation", "customer-recovery"],
    contact: contactValue || null,
    configurationDigest,
    credentialPolicy: "not-collected",
    status: "prepared",
  };
}
