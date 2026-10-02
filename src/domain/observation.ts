/**
 * Observation: strictly what the participant/agent is authorized to see.
 * No grader internals, no future scheduled events, no hidden keys.
 */
import type { EpisodeState } from "./types.ts";
import type { ScenarioDefinition } from "../scenarios/schema.ts";

export interface Observation {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  clockMinute: number;
  day: number;
  status: EpisodeState["status"];
  revision: number;
  condition: EpisodeState["condition"];
  brief: ScenarioDefinition["brief"];
  publicChecklist: string[];
  policy: EpisodeState["policy"];
  budget: { committedMinor: number; limitMinor: number; remainingMinor: number };
  items: EpisodeState["items"];
  suppliers: EpisodeState["suppliers"];
  purchaseOrders: EpisodeState["purchaseOrders"];
  deliveries: EpisodeState["deliveries"];
  invoices: EpisodeState["invoices"];
  ledger: { opening: EpisodeState["ledger"]["opening"]; txns: EpisodeState["ledger"]["txns"] };
  tickets: EpisodeState["tickets"];
  inbox: EpisodeState["messages"];
  workbooks: EpisodeState["workbooks"];
  workNotes: EpisodeState["workNotes"];
  helpRequests: EpisodeState["helpRequests"];
  requirements: EpisodeState["requirements"];
  requirementDueDay: number;
  submission: EpisodeState["submission"];
  recentActions: {
    type: string;
    outcome: string;
    errors: { code: string; message: string }[];
    atMinute: number;
  }[];
}

export function buildObservation(state: EpisodeState, scenario: ScenarioDefinition): Observation {
  return {
    runId: state.runId,
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    clockMinute: state.clockMinute,
    day: Math.floor(state.clockMinute / 1440),
    status: state.status,
    revision: state.revision,
    condition: state.condition,
    brief: scenario.brief,
    publicChecklist: scenario.publicChecklist,
    policy: state.policy,
    budget: {
      committedMinor: state.budget.committedMinor,
      limitMinor: state.policy.budgetMinor,
      remainingMinor: state.policy.budgetMinor - state.budget.committedMinor,
    },
    items: state.items,
    suppliers: state.suppliers,
    purchaseOrders: state.purchaseOrders,
    deliveries: state.deliveries,
    invoices: state.invoices,
    ledger: state.ledger,
    tickets: state.tickets,
    inbox: state.messages,
    workbooks: state.workbooks,
    workNotes: state.workNotes,
    helpRequests: state.helpRequests,
    requirements: state.requirements,
    requirementDueDay: state.requirementDueDay,
    submission: state.submission,
    recentActions: state.actionLog.slice(-10).map((a) => ({
      type: a.type,
      outcome: a.outcome,
      errors: a.errors,
      atMinute: a.atMinute,
    })),
  };
}
