/**
 * Live Cohort Monitoring & Proctoring Stream (Pillar 8, Item 077).
 * Real-time monitoring feed of active student and agent simulation sessions for instructors.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface ActiveLearnerHeartbeat {
  learnerId: string;
  learnerName: string;
  episodeId: string;
  scenarioId: string;
  currentMinute: number;
  lastAction: string;
  status: "on_track" | "in_dispute" | "policy_violation" | "submitted";
  budgetSpentMinor: number;
  helpRequestsUsed: number;
  lastSeenIso: string;
}

export class CohortProctoringFeed {
  private learners = new Map<string, ActiveLearnerHeartbeat>();

  recordHeartbeat(heartbeat: ActiveLearnerHeartbeat): void {
    this.learners.set(heartbeat.learnerId, {
      ...heartbeat,
      lastSeenIso: new Date().toISOString(),
    });
  }

  getActiveLearners(): ActiveLearnerHeartbeat[] {
    const cutoff = Date.now() - 5 * 60 * 1000; // active in last 5 minutes
    return Array.from(this.learners.values()).filter(
      (l) => new Date(l.lastSeenIso).getTime() >= cutoff
    );
  }

  getCohortSummary(): {
    totalActive: number;
    submittedCount: number;
    violationsCount: number;
  } {
    const active = this.getActiveLearners();
    return {
      totalActive: active.length,
      submittedCount: active.filter((l) => l.status === "submitted").length,
      violationsCount: active.filter((l) => l.status === "policy_violation").length,
    };
  }
}
