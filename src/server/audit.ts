/**
 * Prototype in-memory hash-chained audit log. This detects mutation during one
 * process lifetime; it is not durable compliance evidence.
 */

import { createHash, randomUUID } from "node:crypto";
import type { Role } from "./rbac.ts";

export interface SecurityAuditRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorRole: Role;
  action:
    | "USER_LOGIN"
    | "SESSION_INITIALIZE"
    | "ROLE_CHANGE"
    | "POLICY_OVERRIDE"
    | "GRADE_SIGNED_OFF"
    | "EVIDENCE_EXPORTED"
    | "DATA_DELETION_REQUESTED";
  targetResource: string;
  ipAddress: string;
  status: "SUCCESS" | "DENIED";
  metadata?: Record<string, unknown>;
  previousHash: string;
  recordHash: string;
}

export class AuditLogService {
  private static lastHash: string = "GENESIS_BLOCK_00000000000000000000000000000000";
  private static inMemoryLog: SecurityAuditRecord[] = [];

  public static log(
    entry: Omit<SecurityAuditRecord, "id" | "timestamp" | "previousHash" | "recordHash">
  ): SecurityAuditRecord {
    const id = randomUUID();
    const timestamp = new Date().toISOString();
    const previousHash = this.lastHash;

    const metadata = JSON.stringify(entry.metadata ?? {});
    const dataToHash = `${id}|${timestamp}|${entry.actorId}|${entry.actorRole}|${entry.action}|${entry.targetResource}|${entry.ipAddress}|${entry.status}|${metadata}|${previousHash}`;
    const recordHash = createHash("sha256").update(dataToHash).digest("hex");

    const record: SecurityAuditRecord = {
      ...entry,
      id,
      timestamp,
      previousHash,
      recordHash,
    };

    this.lastHash = recordHash;
    this.inMemoryLog.push(record);
    return record;
  }

  public static getLog(): SecurityAuditRecord[] {
    return structuredClone(this.inMemoryLog);
  }

  public static verifyChain(): boolean {
    let currentExpectedPrev = "GENESIS_BLOCK_00000000000000000000000000000000";
    for (const record of this.inMemoryLog) {
      if (record.previousHash !== currentExpectedPrev) {
        return false;
      }
      const metadata = JSON.stringify(record.metadata ?? {});
      const dataToHash = `${record.id}|${record.timestamp}|${record.actorId}|${record.actorRole}|${record.action}|${record.targetResource}|${record.ipAddress}|${record.status}|${metadata}|${record.previousHash}`;
      const computed = createHash("sha256").update(dataToHash).digest("hex");
      if (computed !== record.recordHash) {
        return false;
      }
      currentExpectedPrev = record.recordHash;
    }
    return true;
  }
}
