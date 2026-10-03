import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileStore, MemoryStore, CorruptStateError, STORE_SCHEMA_VERSION } from "../src/server/store.ts";
import { runBaseline } from "../src/grading/baseline.ts";

const meta = {
  runId: "run-store-1",
  scenarioId: "A1",
  scenarioVersion: "1.0.0",
  condition: "agent" as const,
  seed: 42,
  createdAt: "2026-10-01T00:00:00.000Z",
  storeSchemaVersion: STORE_SCHEMA_VERSION,
};

describe("FileStore persistence", () => {
  it("persists actions and digest-verified state, and detects corruption", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ww-store-"));
    try {
      const store = new FileStore(dir);
      await store.createRun(meta);
      const engine = runBaseline("A1");
      const state = engine.getState();
      for (const entry of [{ action: { type: "add_work_note" } as never, actor: { id: "x", kind: "agent" as const, role: "participant" as const } }]) {
        await store.appendAction(meta.runId, entry);
      }
      await store.saveState(meta.runId, state);

      const loaded = await store.loadState(meta.runId);
      expect(loaded.runId).toBe("run-A1-baseline-A1"); // the engine's own runId travels inside the state
      expect(await store.loadActions(meta.runId)).toHaveLength(1);
      expect((await store.listRuns()).map((r) => r.runId)).toContain("run-store-1");

      // Corrupt the stored state on disk — load must refuse and present recovery.
      const statePath = join(dir, meta.runId, "state.json");
      const parsed = JSON.parse(readFileSync(statePath, "utf8"));
      parsed.state.revision += 1;
      writeFileSync(statePath, JSON.stringify(parsed));
      await expect(store.loadState(meta.runId)).rejects.toThrow(CorruptStateError);
      try {
        await store.loadState(meta.runId);
      } catch (e) {
        expect((e as CorruptStateError).recoveryPath.length).toBeGreaterThan(0);
      }

      // Incompatible store schema version is also refused.
      const metaPath = join(dir, meta.runId, "meta.json");
      const m = JSON.parse(readFileSync(metaPath, "utf8"));
      m.storeSchemaVersion = 999;
      writeFileSync(metaPath, JSON.stringify(m));
      await expect(store.loadState(meta.runId)).rejects.toThrow(/store schema/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("MemoryStore round-trips the same state", async () => {
    const store = new MemoryStore();
    await store.createRun(meta);
    const engine = runBaseline("B1");
    await store.saveState(meta.runId, engine.getState());
    const loaded = await store.loadState(meta.runId);
    expect(JSON.stringify(loaded)).toBe(JSON.stringify(engine.getState()));
  });

  it("repeatedly replaces a file-backed checkpoint without exposing corrupt state", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ww-store-"));
    try {
      const store = new FileStore(dir);
      await store.createRun(meta);
      const engine = runBaseline("A1");
      for (let attempt = 0; attempt < 25; attempt += 1) {
        await store.saveState(meta.runId, engine.getState());
        await expect(store.loadState(meta.runId)).resolves.toEqual(engine.getState());
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("rejects run ids that could escape the configured data directory", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ww-store-"));
    try {
      const store = new FileStore(dir);
      await expect(store.loadState("../outside")).rejects.toThrow(/invalid run id/);
      await expect(
        store.createRun({ ...meta, runId: "..\\outside" }),
      ).rejects.toThrow(/invalid run id/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
