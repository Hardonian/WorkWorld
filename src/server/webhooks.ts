/**
 * WorkWorld Outbound Webhook Engine.
 * Dispatches signed HMAC-SHA256 payloads for external evaluation harnesses.
 */

import { createHmac } from "node:crypto";

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

  const payload: WebhookPayload = {
    id: "evt_" + Math.random().toString(36).substring(2, 11),
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
