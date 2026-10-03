/**
 * WorkWorld Domain Simulation Engine — Core Domain Public Surface.
 * Pure TypeScript, zero external dependencies, 100% deterministic business logic.
 */

// Core simulation engine & state transitions
export * from "./engine.ts";
export * from "./types.ts";
export * from "./reducer.ts";
export * from "./observation.ts";
export * from "./invariants.ts";
export * from "./state-diff.ts";
export * from "./ledger.ts";
export * from "./artifacts.ts";

// Advanced enterprise operational modules
export * from "./matching.ts";
export * from "./inventory.ts";
export * from "./disputes.ts";
export * from "./fx.ts";
export * from "./supplier-scorecard.ts";
export * from "./warehouse.ts";
export * from "./accruals.ts";
export * from "./rma.ts";
export * from "./logistics.ts";
export {
  parseCellRef,
  formatCellRef,
  resolveCellValue,
  evaluateFormula as evaluateFormulaSafe,
  expandRange as expandRangeSafe,
  type FormulaResult,
} from "./formula.ts";
export * from "./erp-importer.ts";
export * from "./voice.ts";
export * from "./policy-overrides.ts";
