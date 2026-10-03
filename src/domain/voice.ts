/**
 * Multimodal Live Voice & Phone Call Negotiation Engine (Game Changer #2).
 * Simulates real-time voice call workflows between participants and virtual callers
 * (vendor dispatchers, clinic directors, freight brokers).
 * Pure domain logic: zero React/Next.js dependencies.
 */

import type { ActionInput } from "./types.ts";

export type CallStatus = "idle" | "incoming" | "ringing" | "connected" | "ended";

export interface VoiceCallParticipant {
  id: string;
  name: string;
  role: string;
  organization: string;
  phoneNumber: string;
}

export interface CallUtterance {
  id: string;
  speaker: "caller" | "participant";
  timestampSeconds: number;
  text: string;
  sentiment?: "neutral" | "urgent" | "cooperative" | "adversarial";
}

export interface VoiceNegotiationTerms {
  agreedDeliveryDay?: number;
  agreedUnitPriceMinor?: number;
  waivedExpediteFee?: boolean;
  notes?: string;
}

export interface VoiceCallSession {
  callId: string;
  caller: VoiceCallParticipant;
  scenarioTopic: string;
  status: CallStatus;
  startedAtSeconds: number;
  endedAtSeconds?: number;
  transcript: CallUtterance[];
  negotiatedTerms?: VoiceNegotiationTerms;
}

export class VoiceCallManager {
  private session: VoiceCallSession | null = null;

  initiateIncomingCall(
    caller: VoiceCallParticipant,
    scenarioTopic: string,
    initialGreeting: string
  ): VoiceCallSession {
    this.session = {
      callId: `CALL-${Date.now().toString(36).toUpperCase()}`,
      caller,
      scenarioTopic,
      status: "ringing",
      startedAtSeconds: 0,
      transcript: [
        {
          id: "utt-0",
          speaker: "caller",
          timestampSeconds: 0,
          text: initialGreeting,
          sentiment: "urgent",
        },
      ],
    };
    return this.session;
  }

  answerCall(): VoiceCallSession {
    if (!this.session || this.session.status !== "ringing") {
      throw new Error("No incoming call to answer");
    }
    this.session.status = "connected";
    return this.session;
  }

  addUtterance(speaker: "caller" | "participant", text: string, elapsedSeconds: number): CallUtterance {
    if (!this.session || this.session.status !== "connected") {
      throw new Error("Cannot add utterance to inactive call");
    }
    const utterance: CallUtterance = {
      id: `utt-${this.session.transcript.length}`,
      speaker,
      timestampSeconds: elapsedSeconds,
      text,
    };
    this.session.transcript.push(utterance);
    return utterance;
  }

  commitNegotiationTerms(terms: VoiceNegotiationTerms): VoiceNegotiationTerms {
    if (!this.session || this.session.status !== "connected") {
      throw new Error("Cannot commit terms on inactive call");
    }
    this.session.negotiatedTerms = terms;
    return terms;
  }

  endCall(elapsedSeconds: number): VoiceCallSession {
    if (!this.session) throw new Error("No active call to end");
    this.session.status = "ended";
    this.session.endedAtSeconds = elapsedSeconds;
    return this.session;
  }

  getSession(): VoiceCallSession | null {
    return this.session;
  }

  /**
   * Translates negotiated verbal terms directly into executable domain actions.
   */
  generateSynchronizedActions(ticketId: string): ActionInput[] {
    if (!this.session || !this.session.negotiatedTerms) return [];

    const actions: ActionInput[] = [];
    const { agreedDeliveryDay, agreedUnitPriceMinor, waivedExpediteFee, notes } = this.session.negotiatedTerms;

    // 1. Record formal call summary in ticket notes
    const summaryText = `[PHONE CALL CONCLUDED with ${this.session.caller.name} (${this.session.caller.organization})]: ` +
      `Agreed delivery: Day ${agreedDeliveryDay ?? "N/A"}, Agreed unit price: CAD ${((agreedUnitPriceMinor ?? 0) / 100).toFixed(2)}, ` +
      `Waived expedite fee: ${waivedExpediteFee ? "YES" : "NO"}. Note: ${notes || "N/A"}`;

    actions.push({
      type: "update_ticket",
      ticketId,
      status: "in_progress",
      note: summaryText,
      reference: this.session.callId,
      commitment: agreedDeliveryDay
        ? { promisedDay: agreedDeliveryDay, text: `Verbal phone confirmation: Delivery confirmed for Day ${agreedDeliveryDay}` }
        : null,
    });

    // 2. Add work note for audit trail
    actions.push({
      type: "add_work_note",
      text: `Phone call ${this.session.callId} transcript verified with ${this.session.transcript.length} utterances.`,
    });

    return actions;
  }
}
