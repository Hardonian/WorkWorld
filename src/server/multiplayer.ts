/**
 * Multiplayer Live Ops War Room Engine (Game Changer #6).
 * Coordinates multi-user and human+agent collaborative simulation sessions
 * with role-based action locking and synchronized presence.
 * Pure TypeScript — no React imports.
 */

import { EpisodeEngine } from "../domain/engine.ts";
import { getScenario } from "../scenarios/catalog.ts";
import type { Action, Actor, EpisodeState, Transition } from "../domain/types.ts";

export type WarRoomRole =
  | "operations_director"
  | "procurement_lead"
  | "ap_specialist"
  | "inventory_clerk"
  | "observer";

export interface WarRoomMember {
  userId: string;
  displayName: string;
  role: WarRoomRole;
  isAgent: boolean;
  lastHeartbeatEpoch: number;
}

export interface WarRoomMessage {
  id: string;
  fromUserId: string;
  displayName: string;
  role: WarRoomRole;
  text: string;
  atMinute: number;
}

export class WarRoomSession {
  readonly roomId: string;
  readonly scenarioId: string;
  private engine: EpisodeEngine;
  private members: Map<string, WarRoomMember> = new Map();
  private chatLog: WarRoomMessage[] = [];

  constructor(roomId: string, scenarioId = "A1") {
    this.roomId = roomId;
    this.scenarioId = scenarioId;
    const scenario = getScenario(scenarioId);
    this.engine = EpisodeEngine.reset(scenario, {
      runId: `warroom-${roomId}`,
      seed: 42,
      condition: "assisted",
    });
  }

  join(member: Omit<WarRoomMember, "lastHeartbeatEpoch">): WarRoomMember {
    const fullMember: WarRoomMember = {
      ...member,
      lastHeartbeatEpoch: Date.now(),
    };
    this.members.set(member.userId, fullMember);
    return fullMember;
  }

  leave(userId: string): boolean {
    return this.members.delete(userId);
  }

  getMembers(): WarRoomMember[] {
    return Array.from(this.members.values());
  }

  getState(): EpisodeState {
    return this.engine.getState();
  }

  /**
   * Applies an action dispatched by a role-holder.
   * Validates role authorization for specific action types.
   */
  dispatchAction(userId: string, action: Action): Transition {
    const member = this.members.get(userId);
    if (!member) {
      throw new Error(`User ${userId} is not a member of war room ${this.roomId}`);
    }

    // Role-based action authority
    if (member.role === "observer") {
      throw new Error("Observers cannot mutate war room state");
    }

    if (action.type === "authorize_purchase_order" && member.role === "inventory_clerk") {
      throw new Error("Inventory clerks cannot authorize purchase orders");
    }

    const actor: Actor = {
      kind: member.isAgent ? "agent" : "human",
      id: member.userId,
      role: member.role === "operations_director" ? "manager" : "participant",
    };

    return this.engine.step(action, actor);
  }

  postChatMessage(userId: string, text: string): WarRoomMessage {
    const member = this.members.get(userId);
    if (!member) throw new Error("User not in session");

    const message: WarRoomMessage = {
      id: `chat-${this.chatLog.length + 1}`,
      fromUserId: userId,
      displayName: member.displayName,
      role: member.role,
      text,
      atMinute: this.engine.getState().clockMinute,
    };
    this.chatLog.push(message);
    return message;
  }

  getChatLog(): WarRoomMessage[] {
    return [...this.chatLog];
  }
}
