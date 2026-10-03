/**
 * WorkWorld Model Context Protocol (MCP) Server.
 * Exposes standardized JSON-RPC 2.0 / MCP tools for AI agents and evaluation harnesses.
 */

import { getStore } from "./store.ts";
import { getScenario } from "../scenarios/catalog.ts";
import { buildObservation } from "../domain/observation.ts";
import { EpisodeEngine } from "../domain/engine.ts";
import type { Action, Actor, Supplier } from "../domain/types.ts";

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export const WORKWORLD_MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "observe_state",
    description: "Returns the current authorized observation of the active episode workspace.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Opaque session identifier" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "submit_action",
    description: "Executes a typed operations action against the domain core (e.g. advance_time, draft_purchase_order, authorize_purchase_order, record_delivery, match_invoice, post_journal_entry).",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Opaque session identifier" },
        action: {
          type: "object",
          description: "Typed action payload matching Action interface",
        },
      },
      required: ["sessionId", "action"],
    },
  },
  {
    name: "search_suppliers",
    description: "Searches approved supplier catalog by item ID, lead time, or price.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        itemId: { type: "string", description: "Optional item ID filter" },
        maxLeadTimeDays: { type: "number", description: "Optional max lead time filter" },
      },
      required: ["sessionId"],
    },
  },
  {
    name: "get_financial_ledger",
    description: "Returns the double-entry general ledger transactions and current account balances.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
      },
      required: ["sessionId"],
    },
  },
];

export async function handleMcpRequest(request: {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}) {
  const { id, method, params = {} } = request;

  switch (method) {
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: WORKWORLD_MCP_TOOLS,
        },
      };

    case "tools/call": {
      const name = params.name as string;
      const args = (params.arguments || {}) as Record<string, unknown>;
      const sessionId = args.sessionId as string;

      if (!sessionId) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32602, message: "Missing sessionId parameter" },
        };
      }

      const store = getStore();
      const state = await store.loadState(sessionId);
      if (!state) {
        return {
          jsonrpc: "2.0",
          id,
          error: { code: -32001, message: `Session ${sessionId} not found or inactive` },
        };
      }

      const scenario = getScenario(state.scenarioId);

      if (name === "observe_state") {
        const obs = buildObservation(state, scenario);
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(obs, null, 2) }],
          },
        };
      }

      if (name === "get_financial_ledger") {
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    opening: state.ledger.opening,
                    transactions: state.ledger.txns,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (name === "search_suppliers") {
        const itemId = args.itemId as string | undefined;
        const maxLeadTime = args.maxLeadTimeDays as number | undefined;

        let suppliers = Object.values(state.suppliers) as Supplier[];
        if (itemId) {
          suppliers = suppliers.filter((s) => s.catalog.some((c) => c.itemId === itemId));
        }
        if (maxLeadTime) {
          suppliers = suppliers.filter((s) => s.leadTimeDays <= maxLeadTime);
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: JSON.stringify(suppliers, null, 2) }],
          },
        };
      }

      if (name === "submit_action") {
        const actionPayload = args.action as Action;
        if (!actionPayload || !actionPayload.type) {
          return {
            jsonrpc: "2.0",
            id,
            error: { code: -32602, message: "Invalid action payload" },
          };
        }

        const engine = EpisodeEngine.fromState(scenario, state);
        const actor: Actor = { id: "mcp_agent", kind: "agent", role: "participant" };
        const transition = engine.step(actionPayload, actor);

        if (transition.ok) {
          await store.saveState(sessionId, engine.getState());
        }

        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    ok: transition.ok,
                    feedback: transition.feedback,
                    errors: transition.errors,
                    newRevision: transition.state.revision,
                    clockMinute: transition.state.clockMinute,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Tool ${name} not found` },
      };
    }

    default:
      return {
        jsonrpc: "2.0",
        id,
        error: { code: -32601, message: `Method ${method} not implemented` },
      };
  }
}
