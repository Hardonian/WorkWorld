/**
 * Human-in-the-Loop Approval and Handoff Queue (Pillar 4, Item 036).
 * Manages actions submitted by AI agents that require supervisor approval before execution.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface HandoffItem {
  id: string;
  agentId: string;
  scenarioId: string;
  queuedAtDay: number;
  actionType: string;
  actionPayload: Record<string, unknown>;
  triggerReason: "authority_threshold" | "discrepancy_detected" | "fraud_risk" | "high_value_settlement";
  status: "pending_review" | "approved" | "rejected" | "amended";
  supervisorNotes?: string;
  reviewedAtDay?: number;
}

export class HandoffQueue {
  private queue: Map<string, HandoffItem> = new Map();

  enqueue(item: Omit<HandoffItem, "id" | "status">): HandoffItem {
    const id = `HO-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const fullItem: HandoffItem = {
      ...item,
      id,
      status: "pending_review",
    };
    this.queue.set(id, fullItem);
    return fullItem;
  }

  getPending(): HandoffItem[] {
    return Array.from(this.queue.values()).filter((i) => i.status === "pending_review");
  }

  resolve(
    id: string,
    decision: "approved" | "rejected" | "amended",
    supervisorNotes?: string,
    day?: number
  ): HandoffItem | null {
    const item = this.queue.get(id);
    if (!item) return null;

    item.status = decision;
    item.supervisorNotes = supervisorNotes;
    item.reviewedAtDay = day;
    return item;
  }
}
