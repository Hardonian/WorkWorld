/**
 * Distributed OpenTelemetry Tracing & W3C Traceparent Helper (Pillar 9, Item 084).
 * Pure server logic: zero React/Next.js dependencies.
 */

import { randomBytes } from "node:crypto";

export interface TraceContext {
  traceId: string; // 32 hex chars
  spanId: string; // 16 hex chars
  sampled: boolean;
}

export function generateTraceContext(): TraceContext {
  return {
    traceId: randomBytes(16).toString("hex"),
    spanId: randomBytes(8).toString("hex"),
    sampled: true,
  };
}

export function formatW3cTraceparent(ctx: TraceContext): string {
  const flags = ctx.sampled ? "01" : "00";
  return `00-${ctx.traceId}-${ctx.spanId}-${flags}`;
}

export function parseW3cTraceparent(headerValue: string): TraceContext | null {
  const parts = headerValue.trim().split("-");
  if (parts.length < 4 || parts[0] !== "00" || !parts[1] || !parts[2]) return null;

  return {
    traceId: parts[1],
    spanId: parts[2],
    sampled: parts[3] === "01",
  };
}
