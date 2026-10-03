/**
 * Hierarchical Organization & Cohort Management (Pillar 6, Item 053).
 * Manages enterprise tenant scoping, departments, academic cohorts, and seat quotas.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface OrganizationTenant {
  id: string;
  name: string;
  domain: string;
  seatLimit: number;
  activeSeats: number;
  departments: string[];
}

export interface LearnerCohort {
  id: string;
  organizationId: string;
  name: string;
  instructorId: string;
  assignedScenarios: string[];
  learnerIds: string[];
  startsAt: string;
  endsAt: string;
}

export class OrganizationRegistry {
  private orgs = new Map<string, OrganizationTenant>();
  private cohorts = new Map<string, LearnerCohort>();

  registerOrganization(org: OrganizationTenant): void {
    this.orgs.set(org.id, org);
  }

  getOrganization(id: string): OrganizationTenant | undefined {
    return this.orgs.get(id);
  }

  createCohort(cohort: LearnerCohort): { ok: boolean; error?: string } {
    const org = this.orgs.get(cohort.organizationId);
    if (!org) return { ok: false, error: "Organization not found" };

    if (org.activeSeats + cohort.learnerIds.length > org.seatLimit) {
      return { ok: false, error: `Seat license exceeded: requested ${cohort.learnerIds.length}, available ${org.seatLimit - org.activeSeats}` };
    }

    org.activeSeats += cohort.learnerIds.length;
    this.cohorts.set(cohort.id, cohort);
    return { ok: true };
  }

  getCohort(id: string): LearnerCohort | undefined {
    return this.cohorts.get(id);
  }
}
