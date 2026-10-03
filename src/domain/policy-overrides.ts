/**
 * Tenant-Configurable Policy Overrides (Pillar 6, Item 057).
 * Allows enterprise organizations to customize operational thresholds and compliance rules.
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { Policy } from "./types.ts";

export interface TenantPolicyOverrides {
  organizationId: string;
  customApprovalThresholdMinor?: number; // e.g. CAD 500 instead of default CAD 400
  strictDiscrepancyTolerance?: boolean; // zero price variance allowed
  mandatoryManagerCoSignMinor?: number; // required dual signature above this limit
  maxAllowedHelpRequests?: number;
  permittedCurrencies?: Array<"CAD" | "USD" | "EUR" | "GBP">;
}

export function applyPolicyOverrides(basePolicy: Policy, overrides?: TenantPolicyOverrides): Policy {
  if (!overrides) return basePolicy;

  return {
    ...basePolicy,
    approvalThresholdMinor: overrides.customApprovalThresholdMinor ?? basePolicy.approvalThresholdMinor,
    helpPolicy: {
      ...basePolicy.helpPolicy,
      maxHelpRequests: overrides.maxAllowedHelpRequests ?? basePolicy.helpPolicy.maxHelpRequests,
    },
  };
}
