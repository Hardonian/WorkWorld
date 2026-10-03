/**
 * WorkWorld Outbound Webhook Engine.
 * Dispatches signed HMAC-SHA256 payloads for external evaluation harnesses.
 */

import { createHmac, randomUUID } from "node:crypto";

export type WebhookEventType =
  | "episode.started"
  | "action.executed"
  | "policy.rejected"
  | "time.advanced"
  | "episode.completed"
  | "grade.finalized";

export interface WebhookPayload {
  id: string;
  event: WebhookEventType;
  timestamp: string;
  runId: string;
  scenarioId: string;
  revision: number;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  url: string;
  secret: string; // HMAC secret
  events: WebhookEventType[];
}

export function signWebhookPayload(payloadString: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadString).digest("hex");
}

export async function dispatchWebhook(
  config: WebhookConfig,
  event: WebhookEventType,
  runId: string,
  scenarioId: string,
  revision: number,
  data: Record<string, unknown>
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  if (!config.events.includes(event)) {
    return { ok: true };
  }

  let target: URL;
  try {
    target = new URL(config.url);
  } catch {
    return { ok: false, error: "invalid webhook URL" };
  }
  const privateLiteral = /^(localhost|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?)$/i;
  if (target.protocol !== "https:" || target.username || target.password || privateLiteral.test(target.hostname)) {
    return { ok: false, error: "webhook URL must be a public HTTPS endpoint without embedded credentials" };
  }

  const payload: WebhookPayload = {
    id: randomUUID(),
    event,
    timestamp: new Date().toISOString(),
    runId,
    scenarioId,
    revision,
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signWebhookPayload(body, config.secret);

  try {
    const res = await fetch(config.url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
      headers: {
        "Content-Type": "application/json",
        "X-WorkWorld-Event": event,
        "X-WorkWorld-Signature": `sha256=${signature}`,
      },
      body,
    });

    return {
      ok: res.ok,
      statusCode: res.status,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message,
    };
  }
}
