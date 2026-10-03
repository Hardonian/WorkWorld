/**
 * Automated Skill Diagnostic & Remediation Generator (Pillar 5, Item 048).
 * Analyzes failed evaluation checks to pinpoint operational skill deficits and prescribe remediation paths.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface FailedCheck {
  id: string;
  tier: string;
  detail: string;
}

export type SkillCategory =
  | "accrual_accounting"
  | "inventory_management"
  | "procurement_policy"
  | "supplier_negotiation"
  | "audit_documentation";

export interface SkillDiagnostic {
  category: SkillCategory;
  severity: "critical" | "warning" | "advisory";
  diagnosis: string;
  recommendedExercise: string;
}

const ERROR_PATTERNS: Array<{
  pattern: RegExp;
  category: SkillCategory;
  severity: SkillDiagnostic["severity"];
  diagnosis: string;
  recommendedExercise: string;
}> = [
  {
    pattern: /manager approval|authorization|threshold/i,
    category: "procurement_policy",
    severity: "critical",
    diagnosis: "Disregarded manager approval threshold (Policy P1). Authorized purchase order without required managerial sign-off.",
    recommendedExercise: "Review Policy P1 approval workflow in Episode A1. Practice submitting requests for orders > CAD 400 before authorizing.",
  },
  {
    pattern: /three-way match|quantity mismatch|settled undelivered/i,
    category: "accrual_accounting",
    severity: "critical",
    diagnosis: "Settled invoice without verifying 3-way match against delivery receipt.",
    recommendedExercise: "Complete Episode B1. Practice matching invoice line quantities and unit prices against delivery receipts before approving payment.",
  },
  {
    pattern: /duplicate invoice|duplicate settlement/i,
    category: "accrual_accounting",
    severity: "critical",
    diagnosis: "Paid duplicate invoice without flagging duplicate reference.",
    recommendedExercise: "Review Episode B2. Practice identifying matching invoice numbers and issuing formal vendor discrepancy notices.",
  },
  {
    pattern: /lead time|stockout|shortfall/i,
    category: "inventory_management",
    severity: "warning",
    diagnosis: "Selected supplier with excessive lead time causing customer SLA failure.",
    recommendedExercise: "Review Supplier Catalogs in Episode A1. Compare supplier lead days against customer due dates.",
  },
  {
    pattern: /ticket|note|reference/i,
    category: "audit_documentation",
    severity: "advisory",
    diagnosis: "Failed to leave a reference note on customer ticket or audit log.",
    recommendedExercise: "Ensure all dispatched orders and deliveries are cross-referenced on the operations ticket board.",
  },
];

export function generateSkillDiagnostics(failedChecks: FailedCheck[]): SkillDiagnostic[] {
  const diagnostics: SkillDiagnostic[] = [];
  const seenCategories = new Set<string>();

  for (const check of failedChecks) {
    for (const rule of ERROR_PATTERNS) {
      if (rule.pattern.test(check.detail) || rule.pattern.test(check.id)) {
        if (!seenCategories.has(rule.category)) {
          seenCategories.add(rule.category);
          diagnostics.push({
            category: rule.category,
            severity: rule.severity,
            diagnosis: rule.diagnosis,
            recommendedExercise: rule.recommendedExercise,
          });
        }
      }
    }
  }

  return diagnostics;
}
