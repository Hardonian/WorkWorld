/**
 * Multi-Branch Dynamic Storylines (Pillar 3, Item 027).
 * Decision trees where learner choices trigger branch-specific events and consequences.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export interface StorylineNode {
  id: string;
  narrative: string;
  triggerCondition: {
    actionType?: string;
    targetEntity?: string;
    predicate: (stateSnapshot: Record<string, unknown>) => boolean;
  };
  outcomes: {
    nextBranchId?: string;
    supplierRelationshipChange: number; // e.g. +10 or -20
    incomingMessage?: {
      sender: string;
      subject: string;
      body: string;
    };
  };
}

export interface StorylineTree {
  id: string;
  scenarioId: string;
  nodes: StorylineNode[];
}

export class StorylineEngine {
  private activeNodeId: string;
  private relationshipScores: Record<string, number> = {};

  constructor(private tree: StorylineTree, initialNodeId: string) {
    this.activeNodeId = initialNodeId;
  }

  getCurrentNode(): StorylineNode | undefined {
    return this.tree.nodes.find((n) => n.id === this.activeNodeId);
  }

  evaluateTransition(stateSnapshot: Record<string, unknown>): {
    transitioned: boolean;
    newNodeId?: string;
    outcomes?: StorylineNode["outcomes"];
  } {
    const current = this.getCurrentNode();
    if (!current) return { transitioned: false };

    if (current.triggerCondition.predicate(stateSnapshot)) {
      if (current.outcomes.nextBranchId) {
        this.activeNodeId = current.outcomes.nextBranchId;
      }
      return {
        transitioned: true,
        newNodeId: this.activeNodeId,
        outcomes: current.outcomes,
      };
    }

    return { transitioned: false };
  }
}
