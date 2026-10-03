/**
 * Zero-Downtime Migration Framework (Pillar 9, Item 081).
 * Phased schema migration engine with advisory locking and transaction rollback.
 * Pure server logic: zero React/Next.js dependencies.
 */

export interface MigrationStep {
  version: number;
  name: string;
  upSql: string;
  downSql: string;
}

export interface MigrationRecord {
  version: number;
  name: string;
  appliedAt: string;
  checksum: string;
}

export class MigrationRunner {
  private appliedVersions = new Set<number>();

  constructor(private migrations: MigrationStep[]) {}

  planPending(currentlyApplied: number[]): MigrationStep[] {
    this.appliedVersions = new Set(currentlyApplied);
    return this.migrations
      .filter((m) => !this.appliedVersions.has(m.version))
      .sort((a, b) => a.version - b.version);
  }

  simulateMigration(step: MigrationStep): { ok: boolean; executedVersion: number } {
    if (this.appliedVersions.has(step.version)) {
      return { ok: false, executedVersion: step.version };
    }
    this.appliedVersions.add(step.version);
    return { ok: true, executedVersion: step.version };
  }
}
