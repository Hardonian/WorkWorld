/**
 * Server-side session handling for the demo workspace.
 * - Opaque random session id in an httpOnly cookie (never a client-supplied tenant).
 * - State persists through the EventStore so refresh/resume works.
 * - Every action goes through the shared domain core (same as agents/evaluator).
 */
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { EpisodeEngine } from "../domain/engine.ts";
import type { Action, EpisodeState, Transition } from "../domain/types.ts";
import type { ActorKind } from "../domain/types.ts";
import { getScenario } from "../scenarios/catalog.ts";
import type { Observation } from "../domain/observation.ts";
import { makeStore, STORE_SCHEMA_VERSION, type EventStore } from "./store.ts";
import { sanitizeActionInput } from "./actions.ts";

const COOKIE = "ww_session";
const RUN_TTL_MS = 1000 * 60 * 60 * 24 * 7;

let storeSingleton: EventStore | null = null;
const runTails = new Map<string, Promise<void>>();
function store(): EventStore {
  if (!storeSingleton) {
    const kind = (process.env.WORKWORLD_STORE ?? "file") as "memory" | "file";
    storeSingleton = makeStore(kind);
  }
  return storeSingleton;
}

export interface SessionInfo {
  runId: string;
  scenarioId: string;
  scenarioVersion: string;
  condition: "human" | "agent" | "assisted";
  seed: number;
  createdAt: string;
  storeSchemaVersion: number;
}

function isValidSessionId(id: string): boolean {
  return /^[0-9a-f-]{36}$/.test(id);
}

export async function getSessionId(): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  return id && isValidSessionId(id) ? id : null;
}

/**
 * Hosted mode is explicit and refuses to run when configuration is missing —
 * it never silently falls back to demo data (docs/ARCHITECTURE.md).
 */
export function hostedModeAvailable(): { available: boolean; reason: string } {
  if ((process.env.WORKWORLD_MODE ?? "demo") !== "hosted") {
    return { available: false, reason: "hosted mode not selected (WORKWORLD_MODE=demo)" };
  }
  const missing = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    return {
      available: false,
      reason: `hosted configuration incomplete (missing: ${missing.join(", ")}); hosted paths disabled — no fallback to demo data`,
    };
  }
  return { available: true, reason: "hosted configuration present (verification against a hosted project still pending)" };
}

export async function startSession(
  scenarioId: string,
  condition: "human" | "agent" | "assisted",
  seedOverride?: number,
): Promise<{ observation: Observation; runId: string }> {
  if ((process.env.WORKWORLD_MODE ?? "demo") === "hosted") {
    const hosted = hostedModeAvailable();
    if (!hosted.available) throw new Error(hosted.reason);
  }
  const scenario = getScenario(scenarioId);
  const runId = randomUUID();
  const meta: SessionInfo = {
    runId,
    scenarioId,
    scenarioVersion: scenario.version,
    condition,
    seed:
      seedOverride !== undefined && Number.isSafeInteger(seedOverride)
        ? seedOverride
        : Date.now() % 100000,
    createdAt: new Date().toISOString(),
    storeSchemaVersion: STORE_SCHEMA_VERSION,
  };
  await store().createRun(meta);
  const engine = EpisodeEngine.reset(scenario, { runId, seed: meta.seed, condition });
  await store().saveState(runId, engine.getState());
  return { observation: engine.observe(), runId };
}

export async function loadEngine(): Promise<{ engine: EpisodeEngine; runId: string } | null> {
  const runId = await getSessionId();
  if (!runId) return null;
  return loadEngineForRun(runId);
}

async function loadEngineForRun(
  runId: string,
): Promise<{ engine: EpisodeEngine; runId: string } | null> {
  try {
    const state = await store().loadState(runId);
    const scenario = getScenario(state.scenarioId);
    return { engine: EpisodeEngine.fromState(scenario, state), runId };
  } catch {
    // Missing or corrupt state: caller presents the recovery path (restart episode).
    return null;
  }
}

/** Serialize mutations per run so parallel browser requests cannot lose updates. */
async function withRunLock<T>(runId: string, operation: () => Promise<T>): Promise<T> {
  const previous = runTails.get(runId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => undefined).then(() => gate);
  runTails.set(runId, tail);
  await previous.catch(() => undefined);
  try {
    return await operation();
  } finally {
    release();
    if (runTails.get(runId) === tail) runTails.delete(runId);
  }
}

export async function applyActionInput(
  input: Record<string, unknown>,
): Promise<{ transition: Transition; observation: Observation } | { error: string; code: string }> {
  const runId = await getSessionId();
  if (!runId) return noSession();

  return applyActionForRun(runId, input, "human");
}

export async function applyActionForRun(
  runId: string,
  input: Record<string, unknown>,
  requestedActorKind: Extract<ActorKind, "human" | "agent" | "assisted">,
): Promise<{ transition: Transition; observation: Observation } | { error: string; code: string }> {

  return withRunLock(runId, async () => {
    const loaded = await loadEngineForRun(runId);
    if (!loaded) return noSession();
    const { engine } = loaded;
    let action: Action;
    try {
      const sanitized = sanitizeActionInput(input);
      const expectedRevision =
        input.expectedRevision === undefined
          ? engine.observe().revision
          : Number(input.expectedRevision);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) {
        throw new Error("expectedRevision must be a non-negative integer");
      }
      const suppliedKey = input.idempotencyKey;
      if (
        suppliedKey !== undefined &&
        (typeof suppliedKey !== "string" || suppliedKey.length < 1 || suppliedKey.length > 128)
      ) {
        throw new Error("idempotencyKey must be a non-empty string up to 128 characters");
      }
      action = {
        ...sanitized,
        actionId: randomUUID(),
        idempotencyKey: suppliedKey ?? randomUUID(),
        expectedRevision,
      } as Action;
    } catch (e) {
      return { error: (e as Error).message, code: "PAYLOAD_INVALID" };
    }

    const condition = engine.observe().condition;
    const actor = {
      id: "participant",
      kind:
        requestedActorKind === "agent"
          ? ("agent" as const)
          : condition === "assisted"
            ? ("assisted" as const)
            : ("human" as const),
      role: "participant" as const,
    };
    const transition = engine.step(action, actor);
    await store().appendAction(runId, { action, actor });
    await store().saveState(runId, engine.getState());
    return { transition, observation: engine.observe() };
  });
}

function noSession(): { error: string; code: string } {
  return {
    error:
      "No active episode (or stored state failed verification). Start an episode; prior evidence is preserved in the store.",
    code: "NO_SESSION",
  };
}

export async function currentObservation(): Promise<Observation | null> {
  const loaded = await loadEngine();
  return loaded ? loaded.engine.observe() : null;
}

export async function currentObservationForRun(runId: string): Promise<Observation | null> {
  const loaded = await loadEngineForRun(runId);
  return loaded ? loaded.engine.observe() : null;
}

export async function currentState(): Promise<EpisodeState | null> {
  const loaded = await loadEngine();
  return loaded ? loaded.engine.getState() : null;
}

export async function currentStateForRun(runId: string): Promise<EpisodeState | null> {
  const loaded = await loadEngineForRun(runId);
  return loaded ? loaded.engine.getState() : null;
}

export function cookieName(): string {
  return COOKIE;
}

export function sessionTtlMs(): number {
  return RUN_TTL_MS;
}

export { sanitizeActionInput };
