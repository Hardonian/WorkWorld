/**
 * Episode run persistence: versioned episode metadata + append-only action
 * history + digest-verified derived state. Demo mode supports memory and file
 * stores; hosted mode (Postgres/Supabase) is layered separately in db/.
 *
 * Corrupt or incompatible state is detected (digest + schema version) and a
 * recovery path is presented — never silently repaired.
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import type { Actor, Action, EpisodeState } from "../domain/types.ts";
import { digestState } from "../domain/engine.ts";

export const STORE_SCHEMA_VERSION = 1;

export interface RunMeta {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  condition: "human" | "agent" | "assisted";
  seed: number;
  createdAt: string;
  storeSchemaVersion: number;
}

export interface StoredAction {
  action: Action;
  actor: Actor;
}

export class CorruptStateError extends Error {
  readonly recoveryPath: string[];
  constructor(runId: string, reason: string) {
    super(`run ${runId}: corrupt or incompatible state — ${reason}`);
    this.name = "CorruptStateError";
    this.recoveryPath = [
      `restore the last verified checkpoint for ${runId} (engine.restore)`,
      `or replay the immutable action log (EpisodeEngine.replay)`,
      `or restart the episode (fresh runId) — prior evidence remains in the store`,
    ];
  }
}

export interface EventStore {
  createRun(meta: RunMeta): Promise<void>;
  appendAction(runId: string, entry: StoredAction): Promise<void>;
  loadActions(runId: string): Promise<StoredAction[]>;
  saveState(runId: string, state: EpisodeState): Promise<void>;
  loadState(runId: string): Promise<EpisodeState>;
  listRuns(): Promise<RunMeta[]>;
}

export class MemoryStore implements EventStore {
  private runs = new Map<string, RunMeta>();
  private actions = new Map<string, StoredAction[]>();
  private states = new Map<string, { digest: string; state: EpisodeState }>();

  async createRun(meta: RunMeta): Promise<void> {
    this.runs.set(meta.runId, meta);
    this.actions.set(meta.runId, []);
  }

  async appendAction(runId: string, entry: StoredAction): Promise<void> {
    if (!this.runs.has(runId)) throw new Error(`unknown run ${runId}`);
    this.actions.get(runId)!.push(entry);
  }

  async loadActions(runId: string): Promise<StoredAction[]> {
    return this.actions.get(runId) ?? [];
  }

  async saveState(runId: string, state: EpisodeState): Promise<void> {
    this.states.set(runId, { digest: digestState(state), state: structuredClone(state) });
  }

  async loadState(runId: string): Promise<EpisodeState> {
    const saved = this.states.get(runId);
    if (!saved) throw new Error(`no saved state for ${runId}`);
    if (digestState(saved.state) !== saved.digest) throw new CorruptStateError(runId, "digest mismatch");
    return structuredClone(saved.state);
  }

  async listRuns(): Promise<RunMeta[]> {
    return [...this.runs.values()];
  }
}

export class FileStore implements EventStore {
  constructor(private readonly dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
  }

  private dir(runId: string): string {
    return join(this.dataDir, runId);
  }

  async createRun(meta: RunMeta): Promise<void> {
    const dir = this.dir(meta.runId);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "meta.json"), JSON.stringify(meta, null, 2));
    writeFileSync(join(dir, "actions.jsonl"), "");
  }

  private meta(runId: string): RunMeta {
    const path = join(this.dir(runId), "meta.json");
    if (!existsSync(path)) throw new Error(`unknown run ${runId}`);
    const meta = JSON.parse(readFileSync(path, "utf8")) as RunMeta;
    if (meta.storeSchemaVersion !== STORE_SCHEMA_VERSION) {
      throw new CorruptStateError(runId, `store schema ${meta.storeSchemaVersion} != ${STORE_SCHEMA_VERSION}`);
    }
    return meta;
  }

  async appendAction(runId: string, entry: StoredAction): Promise<void> {
    this.meta(runId);
    appendFileSync(join(this.dir(runId), "actions.jsonl"), JSON.stringify(entry) + "\n");
  }

  async loadActions(runId: string): Promise<StoredAction[]> {
    this.meta(runId);
    const path = join(this.dir(runId), "actions.jsonl");
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l) as StoredAction);
  }

  async saveState(runId: string, state: EpisodeState): Promise<void> {
    this.meta(runId);
    writeFileSync(
      join(this.dir(runId), "state.json"),
      JSON.stringify({ digest: digestState(state), state }, null, 2),
    );
  }

  async loadState(runId: string): Promise<EpisodeState> {
    this.meta(runId);
    const path = join(this.dir(runId), "state.json");
    if (!existsSync(path)) throw new Error(`no saved state for ${runId}`);
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { digest: string; state: EpisodeState };
    if (digestState(parsed.state) !== parsed.digest) {
      throw new CorruptStateError(runId, "state digest mismatch");
    }
    return parsed.state;
  }

  async listRuns(): Promise<RunMeta[]> {
    return readdirSync(this.dataDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => {
        const path = join(this.dataDir, e.name, "meta.json");
        return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as RunMeta) : null;
      })
      .filter((m): m is RunMeta => m !== null);
  }
}

export function makeStore(kind: "memory" | "file", dataDir?: string): EventStore {
  if (kind === "memory") return new MemoryStore();
  return new FileStore(dataDir ?? process.env.WORKWORLD_DATA_DIR ?? "./var/demo-data");
}
