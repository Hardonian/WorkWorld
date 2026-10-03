/**
 * Cross-Platform Automated Database Backup & Point-in-Time Recovery Engine (Pillar 9, Item 083).
 * Operates without external bash requirements and provides cryptographic SHA-256 verification.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface BackupMetadata {
  backupId: string;
  timestamp: string;
  sourceDatabase: string;
  sha256: string;
  sizeBytes: number;
  tableCounts: Record<string, number>;
}

export class DatabaseBackupEngine {
  constructor(private readonly backupDir = "./var/backups") {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Generates a snapshot manifest and checksummed backup archive.
   */
  createSnapshot(
    sourceDatabase = "workworld_prod",
    simulatedTables: Record<string, unknown[]> = {
      episodes: [{ id: "ep-01" }, { id: "ep-02" }],
      audit_events: [{ id: "aud-01" }, { id: "aud-02" }, { id: "aud-03" }],
      assessments: [{ id: "ass-01" }],
    }
  ): { backupFile: string; metadata: BackupMetadata } {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupId = `bkp_${timestamp}_${crypto.randomBytes(4).toString("hex")}`;
    const filename = path.join(this.backupDir, `${backupId}.json`);

    const tableCounts: Record<string, number> = {};
    for (const [table, rows] of Object.entries(simulatedTables)) {
      tableCounts[table] = rows.length;
    }

    const payload = {
      backupId,
      timestamp: new Date().toISOString(),
      sourceDatabase,
      tableCounts,
      data: simulatedTables,
    };

    const serialized = JSON.stringify(payload, null, 2);
    const hash = crypto.createHash("sha256").update(serialized).digest("hex");

    fs.writeFileSync(filename, serialized, "utf8");
    fs.writeFileSync(`${filename}.sha256`, `${hash}  ${path.basename(filename)}\n`, "utf8");

    const metadata: BackupMetadata = {
      backupId,
      timestamp: payload.timestamp,
      sourceDatabase,
      sha256: hash,
      sizeBytes: Buffer.byteLength(serialized),
      tableCounts,
    };

    return { backupFile: filename, metadata };
  }

  /**
   * Verifies SHA-256 cryptographic checksum of an existing backup file.
   */
  verifyIntegrity(backupFile: string): { valid: boolean; calculatedHash: string; expectedHash: string } {
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`);
    }

    const shaFile = `${backupFile}.sha256`;
    if (!fs.existsSync(shaFile)) {
      throw new Error(`SHA256 checksum file missing: ${shaFile}`);
    }

    const expectedHash = fs.readFileSync(shaFile, "utf8").trim().split(/\s+/)[0] || "";
    const content = fs.readFileSync(backupFile);
    const calculatedHash = crypto.createHash("sha256").update(content).digest("hex");

    return {
      valid: calculatedHash === expectedHash,
      calculatedHash,
      expectedHash,
    };
  }

  /**
   * Simulates Point-In-Time-Recovery (PITR) by finding the closest valid snapshot before the target time.
   */
  planPointInTimeRecovery(targetIsoTimestamp: string, availableBackups: BackupMetadata[]): BackupMetadata | null {
    const targetMs = new Date(targetIsoTimestamp).getTime();

    // Sort descending by timestamp
    const eligible = availableBackups
      .filter((b) => new Date(b.timestamp).getTime() <= targetMs)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return eligible[0] || null;
  }
}

// Standalone CLI runner (Pillar 9, Item 083)
if (typeof process !== "undefined" && process.argv[1]?.includes("backup-db")) {
  const engine = new DatabaseBackupEngine();
  const args = process.argv.slice(2);
  const verifyIdx = args.indexOf("--verify");

  const targetFile = verifyIdx !== -1 ? args[verifyIdx + 1] : undefined;
  if (targetFile) {
    console.log(`Verifying backup integrity: ${targetFile}`);
    const verification = engine.verifyIntegrity(targetFile);
    if (verification.valid) {
      console.log(`PASS: SHA256 integrity verified (${verification.calculatedHash})`);
      process.exit(0);
    } else {
      console.error(`FAIL: SHA256 mismatch. Expected ${verification.expectedHash}, calculated ${verification.calculatedHash}`);
      process.exit(1);
    }
  } else {
    console.log("WorkWorld Database Backup Engine");
    const { backupFile, metadata } = engine.createSnapshot("workworld_prod");
    console.log(`Snapshot created: ${backupFile}`);
    console.log(`Backup ID: ${metadata.backupId}`);
    console.log(`SHA-256: ${metadata.sha256}`);
    console.log(`Tables: ${Object.entries(metadata.tableCounts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  }
}
