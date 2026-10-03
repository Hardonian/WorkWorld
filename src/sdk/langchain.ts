/**
 * LangChain & Agent Framework Interoperability Adapter (LangGraph, CrewAI, AutoGen).
 * Exposes WorkWorld operations tools formatted for direct binding into LLM agent runtimes.
 * Pure TypeScript — zero external dependency requirements.
 */

import type { Action, Actor } from "../domain/types.ts";

export interface LangChainToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const WORKWORLD_LANGCHAIN_TOOL_DEFINITIONS: LangChainToolDefinition[] = [
  {
    name: "workworld_observe_state",
    description: "Inspect the current WorkWorld operational state: clock, inventory, inbox messages, active tickets, and cash balance.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "workworld_submit_action",
    description: "Submit a domain action to advance simulation: create PO, match invoice, settle bill, send ticket message, or advance time.",
    parameters: {
      type: "object",
      properties: {
        actionType: {
          type: "string",
          description: "Type of action to dispatch",
          enum: [
            "submit_purchase_order",
            "settle_invoice",
            "update_ticket",
            "advance_time",
            "request_human_help",
            "complete_episode",
          ],
        },
        payload: {
          type: "string",
          description: "JSON-serialized action payload parameters matching the action schema.",
        },
      },
      required: ["actionType", "payload"],
    },
  },
  {
    name: "workworld_search_catalog",
    description: "Search approved vendor catalogs for available supplies, unit prices, lead times, and terms.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Item name, SKU, or category to look up across approved vendor catalogs.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "workworld_read_artifact",
    description: "Read an artifact: incoming vendor invoice, bill of lading, receiving slip, or company policy handbook.",
    parameters: {
      type: "object",
      properties: {
        artifactId: {
          type: "string",
          description: "ID of the artifact to read (e.g. 'INV-1001', 'DEL-901', 'POLICY-PROCUREMENT').",
        },
      },
      required: ["artifactId"],
    },
  },
];

export class LangChainAgentAdapter {
  constructor(private readonly dispatchFn: (action: Action, actor: Actor) => Promise<unknown>) {}

  getToolDefinitions(): LangChainToolDefinition[] {
    return [...WORKWORLD_LANGCHAIN_TOOL_DEFINITIONS];
  }

  async executeToolCall(toolName: string, args: Record<string, unknown>): Promise<string> {
    switch (toolName) {
      case "workworld_observe_state": {
        const obs = await this.dispatchFn({ type: "advance_time", minutes: 0 } as Action, {
          kind: "agent",
          id: "langchain-agent",
          role: "participant",
        });
        return JSON.stringify(obs);
      }

      case "workworld_submit_action": {
        const actionType = args.actionType as string;
        const payloadStr = args.payload as string;
        const payloadObj = JSON.parse(payloadStr) as Record<string, unknown>;
        const res = await this.dispatchFn(
          { type: actionType, ...payloadObj } as Action,
          { kind: "agent", id: "langchain-agent", role: "participant" }
        );
        return JSON.stringify(res);
      }

      default:
        return JSON.stringify({ error: `Tool ${toolName} acknowledged` });
    }
  }
}
