/**
 * Streaming Agent Telemetry Engine (Pillar 4, Item 032).
 * Formats agent reasoning thoughts, tool calls, and state changes for SSE streaming.
 * Pure domain logic: zero React/Next.js dependencies.
 */

export type TelemetryEventType =
  | "agent_thought"
  | "tool_call_start"
  | "tool_call_complete"
  | "state_delta"
  | "step_complete"
  | "error";

export interface TelemetryEvent {
  id: string;
  runId: string;
  stepIndex: number;
  timestamp: string;
  type: TelemetryEventType;
  payload: Record<string, unknown>;
}

export function createTelemetryEvent(
  runId: string,
  stepIndex: number,
  type: TelemetryEventType,
  payload: Record<string, unknown>
): TelemetryEvent {
  return {
    id: `TEL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    runId,
    stepIndex,
    timestamp: new Date().toISOString(),
    type,
    payload,
  };
}

export function formatSseMessage(event: TelemetryEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export class TelemetryCollector {
  private events: TelemetryEvent[] = [];

  constructor(public readonly runId: string) {}

  emit(stepIndex: number, type: TelemetryEventType, payload: Record<string, unknown>): TelemetryEvent {
    const ev = createTelemetryEvent(this.runId, stepIndex, type, payload);
    this.events.push(ev);
    return ev;
  }

  getEvents(): readonly TelemetryEvent[] {
    return this.events;
  }

  clear(): void {
    this.events = [];
  }
}
