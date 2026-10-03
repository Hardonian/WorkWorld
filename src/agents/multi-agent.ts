/**
 * Multi-Agent Collaborative Roleplay Runtime (Pillar 4, Item 033).
 * Coordinates specialized sub-agents: Ops Coordinator, AP Auditor, Inventory Specialist.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export type AgentRole = "operations_coordinator" | "ap_auditor" | "inventory_specialist";

export interface AgentMessage {
  fromRole: AgentRole;
  toRole: AgentRole | "all";
  content: string;
  recommendedAction?: Record<string, unknown>;
  timestampMinute: number;
}

export interface AgentPersona {
  role: AgentRole;
  systemPrompt: string;
  focusArea: string;
  authorityLimitMinor: number;
}

export const AGENT_PERSONAS: Record<AgentRole, AgentPersona> = {
  operations_coordinator: {
    role: "operations_coordinator",
    systemPrompt: "You are the Operations Coordinator. You lead customer communication, supplier order drafting, and manager approvals.",
    focusArea: "Fulfillment SLA and Customer Tickets",
    authorityLimitMinor: 40000,
  },
  ap_auditor: {
    role: "ap_auditor",
    systemPrompt: "You are the Accounts Payable Auditor. You enforce 3-way matching, flag duplicates, calculate debit memos, and authorize payments.",
    focusArea: "Invoice Reconciliation & Payment Timing",
    authorityLimitMinor: 500000,
  },
  inventory_specialist: {
    role: "inventory_specialist",
    systemPrompt: "You are the Inventory Specialist. You inspect delivery arrival, record shortages, verify safety stock, and track bins.",
    focusArea: "Receiving & Warehouse Capacity",
    authorityLimitMinor: 100000,
  },
};

export class MultiAgentTeamCoordinator {
  private messageLog: AgentMessage[] = [];

  postMessage(msg: AgentMessage): void {
    this.messageLog.push(msg);
  }

  getMessages(): readonly AgentMessage[] {
    return this.messageLog;
  }

  /**
   * Evaluates consensus across agent recommendations.
   */
  reachConsensus(actionType: string): {
    approved: boolean;
    consensusRatio: number;
    votes: Record<AgentRole, boolean>;
  } {
    const votes: Record<AgentRole, boolean> = {
      operations_coordinator: true,
      ap_auditor: true,
      inventory_specialist: true,
    };

    // If payment action without AP approval, reject
    if (actionType.includes("payment") && !this.messageLog.some((m) => m.fromRole === "ap_auditor")) {
      votes.ap_auditor = false;
    }

    const totalVotes = Object.values(votes).length;
    const positiveVotes = Object.values(votes).filter(Boolean).length;
    const consensusRatio = positiveVotes / totalVotes;

    const hasRequiredRoleApproval = actionType.includes("payment") ? votes.ap_auditor : true;

    return {
      approved: hasRequiredRoleApproval && consensusRatio >= 0.66,
      consensusRatio,
      votes,
    };
  }
}
