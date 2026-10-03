/**
 * WorkWorld Security & Administrative Audit Log.
 * Tamper-evident, hash-chained log for enterprise compliance (SOC2 / FERPA).
 */

import { createHash } from "node:crypto";
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
    const id = "sec_" + Math.random().toString(36).substring(2, 11);
    const timestamp = new Date().toISOString();
    const previousHash = this.lastHash;

    const dataToHash = `${id}|${timestamp}|${entry.actorId}|${entry.actorRole}|${entry.action}|${entry.targetResource}|${entry.status}|${previousHash}`;
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
    return [...this.inMemoryLog];
  }

  public static verifyChain(): boolean {
    let currentExpectedPrev = "GENESIS_BLOCK_00000000000000000000000000000000";
    for (const record of this.inMemoryLog) {
      if (record.previousHash !== currentExpectedPrev) {
        return false;
      }
      const dataToHash = `${record.id}|${record.timestamp}|${record.actorId}|${record.actorRole}|${record.action}|${record.targetResource}|${record.status}|${record.previousHash}`;
      const computed = createHash("sha256").update(dataToHash).digest("hex");
      if (computed !== record.recordHash) {
        return false;
      }
      currentExpectedPrev = record.recordHash;
    }
    return true;
  }
}
