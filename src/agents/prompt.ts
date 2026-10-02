/**
 * Agent prompt construction and decision parsing.
 * The prompt contains ONLY the participant-authorized observation — never
 * grader internals, hidden keys, future scheduled events, or withheld material.
 */
import type { Observation } from "../domain/observation.ts";
import type { ActionInput } from "../domain/types.ts";
import type { AgentDecision, ChatMessage, ProviderUsage } from "./types.ts";

export const DECISION_CONTRACT = `You are the Operations Coordinator in a simulated business workspace.
Reply with ONE JSON object and nothing else:
{"action": <one typed action payload or null>, "notes": "<short rationale>", "advice": null, "handoff": null}
Action types and payloads:
- advance_time: {"type":"advance_time","minutes":N}
- draft_purchase_order: {"type":"draft_purchase_order","poId":"PO-x","supplierId":"...","lines":[{"itemId":"...","qty":N,"unitPriceMinor":N}],"requestedDeliveryDay":N,"note":"..."}
- submit_purchase_order: {"type":"submit_purchase_order","poId":"..."}
- request_approval: {"type":"request_approval","poId":"..."}
- authorize_purchase_order: {"type":"authorize_purchase_order","poId":"..."}
- cancel_purchase_order: {"type":"cancel_purchase_order","poId":"...","reason":"..."}
- amend_purchase_order: {"type":"amend_purchase_order","poId":"...","addLines":[...],"removeLines":[...],"qtyChanges":[{"itemId":"...","newQty":N}],"note":"..."}
- record_delivery: {"type":"record_delivery","deliveryId":"...","verifiedLines":[{"itemId":"...","qty":N}],"note":"..."}
- receive_invoice: {"type":"receive_invoice","invoiceId":"...","invoiceNumber":"...","supplierId":"...","poId":"...","lines":[...],"amountMinor":N,"currency":"CAD","dueDay":N}
- match_invoice: {"type":"match_invoice","invoiceId":"...","poId":"...","deliveryId":"..."}
- approve_invoice: {"type":"approve_invoice","invoiceId":"...","adjustedAmountMinor":N|null,"note":"..."}
- schedule_payment: {"type":"schedule_payment","invoiceId":"...","payDay":N}
- run_payment_run: {"type":"run_payment_run","payDay":N,"invoiceIds":["..."]}
- dispute_invoice: {"type":"dispute_invoice","invoiceId":"...","reason":"...","note":"..."}
- flag_duplicate_invoice: {"type":"flag_duplicate_invoice","invoiceId":"...","duplicateOfId":"..."}
- update_ticket: {"type":"update_ticket","ticketId":"...","status":"open|in_progress|waiting|resolved|closed|null","note":"...","reference":"<record id>","commitment":{"promisedDay":N,"text":"..."}|null}
- send_message: {"type":"send_message","messageId":"MSG-x","to":"...","subject":"...","body":"...","relatedTo":"...","commitment":{...}|null}
- update_spreadsheet: {"type":"update_spreadsheet","workbookId":"...","cells":[{"ref":"A1","value":...,"formula":"..."}]}
- add_work_note: {"type":"add_work_note","text":"..."}
- request_help: {"type":"request_help","question":"..."}
- submit_work: {"type":"submit_work","summary":"..."}
Rules: use unitPriceMinor exactly as listed in the supplier catalog; money is integer minor units;
never settle undelivered goods; keep customer promises feasible; record every consequential change.
When the work is complete, submit_work.`;

export function buildMessages(obs: Observation): ChatMessage[] {
  return [
    { role: "system", content: DECISION_CONTRACT },
    {
      role: "user",
      content:
        "Current authorized observation (JSON):\n" +
        JSON.stringify(obs) +
        "\n\nPropose the single best next action as the JSON contract specifies.",
    },
  ];
}

/** Extract the first balanced JSON object from model text (bounded scan). */
export function extractJson(text: string): unknown | null {
  const start = text.indexOf("{");
  if (start < 0 || text.length > 20000) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < Math.min(text.length, start + 20000); i++) {
    const ch = text[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseDecision(
  text: string,
  usage: ProviderUsage,
  provider: string,
  model: string,
): { decision: AgentDecision; parseError: string | null } {
  const parsed = extractJson(text) as
    | { action?: unknown; notes?: unknown; advice?: unknown; handoff?: unknown }
    | null;
  if (!parsed || typeof parsed !== "object") {
    return {
      decision: {
        action: null,
        notes: "",
        advice: null,
        handoff: null,
        rawText: text.slice(0, 2000),
        usage,
        provider,
        model,
      },
      parseError: "invalid tool output: no parseable JSON decision",
    };
  }
  return {
    decision: {
      action: (parsed.action ?? null) as ActionInput | null,
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 2000) : "",
      advice: typeof parsed.advice === "string" ? parsed.advice.slice(0, 2000) : null,
      handoff: typeof parsed.handoff === "string" ? parsed.handoff.slice(0, 2000) : null,
      rawText: text.slice(0, 2000),
      usage,
      provider,
      model,
    },
    parseError: null,
  };
}
