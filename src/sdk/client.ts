/**
 * WorkWorld Official TypeScript / JavaScript Client SDK.
 * Ergonomic client library for driving WorkWorld programmatically from AI benchmarks or automated testing harnesses.
 */

import type { Action, PoId, SupplierId, PoLine, DeliveryId, DeliveryLine } from "../domain/types.ts";
import type { Observation } from "../domain/observation.ts";
import type { AssessmentReport } from "../grading/report.ts";

export interface ClientConfig {
  baseUrl?: string;
  apiKey?: string;
}

export class WorkWorldClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(config: ClientConfig = {}) {
    this.baseUrl = (config.baseUrl || "http://localhost:3100").replace(/\/$/, "");
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`WorkWorld API Error (${res.status}): ${errText}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Starts a new episode session.
   */
  public async startEpisode(
    scenarioId: string = "A1",
    options: { condition?: "human" | "agent" | "assisted"; seed?: number } = {}
  ): Promise<{ sessionId: string; runId: string; scenarioId: string; observation: Observation }> {
    return this.request("/api/v1/episodes", {
      method: "POST",
      body: JSON.stringify({
        scenarioId,
        condition: options.condition ?? "agent",
        seed: options.seed ?? 42,
      }),
    });
  }

  /**
   * Retrieves the current observation for an active session.
   */
  public async observe(sessionId: string): Promise<Observation> {
    const data = await this.request<{ observation: Observation }>(
      `/api/v1/episodes?sessionId=${encodeURIComponent(sessionId)}`
    );
    return data.observation;
  }

  /**
   * Submits a typed domain action against the active session.
   */
  public async step(
    sessionId: string,
    action: Action
  ): Promise<{
    ok: boolean;
    feedback: string;
    errors: { code: string; message: string }[];
    revision: number;
    observation: Observation;
  }> {
    return this.request("/api/v1/actions", {
      method: "POST",
      body: JSON.stringify({ sessionId, action }),
    });
  }

  /**
   * Advances logical simulation time by a specified number of minutes.
   */
  public async advanceTime(sessionId: string, minutes: number = 60, currentRevision: number = 0) {
    const action: Action = {
      type: "advance_time",
      actionId: "act_" + Math.random().toString(36).substring(2, 9),
      idempotencyKey: "idem_" + Math.random().toString(36).substring(2, 9),
      expectedRevision: currentRevision,
      minutes,
    };
    return this.step(sessionId, action);
  }

  /**
   * Drafts a purchase order.
   */
  public async draftPo(
    sessionId: string,
    poId: PoId,
    supplierId: SupplierId,
    lines: PoLine[],
    requestedDeliveryDay: number = 3,
    note: string = "",
    currentRevision: number = 0
  ) {
    const action: Action = {
      type: "draft_purchase_order",
      actionId: "act_" + Math.random().toString(36).substring(2, 9),
      idempotencyKey: "idem_" + Math.random().toString(36).substring(2, 9),
      expectedRevision: currentRevision,
      poId,
      supplierId,
      lines,
      requestedDeliveryDay,
      note,
    };
    return this.step(sessionId, action);
  }

  /**
   * Authorizes a purchase order.
   */
  public async authorizePo(sessionId: string, poId: PoId, currentRevision: number = 0) {
    const action: Action = {
      type: "authorize_purchase_order",
      actionId: "act_" + Math.random().toString(36).substring(2, 9),
      idempotencyKey: "idem_" + Math.random().toString(36).substring(2, 9),
      expectedRevision: currentRevision,
      poId,
    };
    return this.step(sessionId, action);
  }

  /**
   * Records verified lines on an arriving delivery.
   */
  public async recordDelivery(
    sessionId: string,
    deliveryId: DeliveryId,
    verifiedLines: DeliveryLine[],
    note: string = "Recorded delivery via SDK",
    currentRevision: number = 0
  ) {
    const action: Action = {
      type: "record_delivery",
      actionId: "act_" + Math.random().toString(36).substring(2, 9),
      idempotencyKey: "idem_" + Math.random().toString(36).substring(2, 9),
      expectedRevision: currentRevision,
      deliveryId,
      verifiedLines,
      note,
    };
    return this.step(sessionId, action);
  }

  /**
   * Deterministically grades the active episode session.
   */
  public async grade(
    sessionId: string
  ): Promise<{ report: AssessmentReport; sessionId: string; runId: string; scenarioId: string }> {
    return this.request("/api/v1/evaluations", {
      method: "POST",
      body: JSON.stringify({ sessionId }),
    });
  }
}
