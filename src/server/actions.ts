/**
 * Action payload sanitizer — the untrusted-input boundary for UI/API callers.
 * Whitelists fields per action type, coerces and bounds values. The domain
 * reducer performs the authoritative permission/state/policy validation.
 */
import type { ActionInput } from "../domain/types.ts";

type Raw = Record<string, unknown>;

function str(v: unknown, field: string, max = 500): string {
  if (typeof v !== "string") throw new Error(`${field} must be a string`);
  if (v.length > max) throw new Error(`${field} exceeds ${max} chars`);
  return v;
}

function optStr(v: unknown, field: string, max = 500): string | null {
  return v === undefined || v === null ? null : str(v, field, max);
}

function int(v: unknown, field: string, min = 0, max = 100_000_000): number {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
    throw new Error(`${field} must be an integer in [${min}, ${max}]`);
  }
  return n;
}

function optInt(v: unknown, field: string, min = 0, max = 100_000_000): number | null {
  return v === undefined || v === null ? null : int(v, field, min, max);
}

function lines(v: unknown, field: string) {
  if (!Array.isArray(v) || v.length === 0 || v.length > 50) {
    throw new Error(`${field} must be an array of 1..50 lines`);
  }
  return v.map((l, i) => {
    const raw = l as Raw;
    return {
      itemId: str(raw.itemId, `${field}[${i}].itemId`, 40),
      qty: int(raw.qty, `${field}[${i}].qty`, 1, 10_000),
      unitPriceMinor: int(raw.unitPriceMinor, `${field}[${i}].unitPriceMinor`, 1),
    };
  });
}

export function sanitizeActionInput(input: Raw): ActionInput {
  const type = str(input.type, "type", 40);
  switch (type) {
    case "advance_time":
      return { type, minutes: int(input.minutes, "minutes", 1, 20160) };
    case "draft_purchase_order":
      return {
        type,
        poId: str(input.poId, "poId", 40),
        supplierId: str(input.supplierId, "supplierId", 40),
        lines: lines(input.lines, "lines"),
        requestedDeliveryDay: int(input.requestedDeliveryDay, "requestedDeliveryDay", 0, 1000),
        note: str(input.note ?? "", "note", 2000),
      };
    case "submit_purchase_order":
    case "request_approval":
    case "authorize_purchase_order":
      return { type, poId: str(input.poId, "poId", 40) };
    case "approve_purchase_order":
      return { type, poId: str(input.poId, "poId", 40) };
    case "cancel_purchase_order":
      return {
        type,
        poId: str(input.poId, "poId", 40),
        reason: str(input.reason ?? "", "reason", 500),
      };
    case "amend_purchase_order":
      return {
        type,
        poId: str(input.poId, "poId", 40),
        addLines: Array.isArray(input.addLines) && input.addLines.length
          ? lines(input.addLines, "addLines")
          : [],
        removeLines: Array.isArray(input.removeLines)
          ? input.removeLines.map((x, i) => str(x, `removeLines[${i}]`, 40)).slice(0, 50)
          : [],
        qtyChanges: Array.isArray(input.qtyChanges)
          ? input.qtyChanges.slice(0, 50).map((c, i) => {
              const raw = c as Raw;
              return {
                itemId: str(raw.itemId, `qtyChanges[${i}].itemId`, 40),
                newQty: int(raw.newQty, `qtyChanges[${i}].newQty`, 1, 10_000),
              };
            })
          : [],
        note: str(input.note ?? "", "note", 2000),
      };
    case "record_delivery":
      return {
        type,
        deliveryId: str(input.deliveryId, "deliveryId", 60),
        verifiedLines: (Array.isArray(input.verifiedLines) ? input.verifiedLines : []).map((l, i) => {
          const raw = l as Raw;
          return {
            itemId: str(raw.itemId, `verifiedLines[${i}].itemId`, 40),
            qty: int(raw.qty, `verifiedLines[${i}].qty`, 1, 10_000),
            ...(raw.substituteFor ? { substituteFor: str(raw.substituteFor, `verifiedLines[${i}].substituteFor`, 40) } : {}),
          };
        }),
        note: str(input.note ?? "", "note", 2000),
      };
    case "receive_invoice":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        invoiceNumber: str(input.invoiceNumber, "invoiceNumber", 60),
        supplierId: str(input.supplierId, "supplierId", 40),
        poId: str(input.poId, "poId", 40),
        lines: lines(input.lines, "lines"),
        amountMinor: int(input.amountMinor, "amountMinor", 1),
        currency: str(input.currency, "currency", 3) as "CAD" | "USD",
        dueDay: int(input.dueDay, "dueDay", 0, 1000),
      };
    case "match_invoice":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        poId: str(input.poId, "poId", 40),
        deliveryId: str(input.deliveryId, "deliveryId", 60),
      };
    case "approve_invoice":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        adjustedAmountMinor: optInt(input.adjustedAmountMinor, "adjustedAmountMinor", 1),
        note: str(input.note ?? "", "note", 2000),
      };
    case "schedule_payment":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        payDay: int(input.payDay, "payDay", 0, 1000),
      };
    case "run_payment_run":
      return {
        type,
        payDay: int(input.payDay, "payDay", 0, 1000),
        invoiceIds: (Array.isArray(input.invoiceIds) ? input.invoiceIds : [])
          .map((x, i) => str(x, `invoiceIds[${i}]`, 40))
          .slice(0, 50),
      };
    case "dispute_invoice":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        reason: str(input.reason ?? "", "reason", 500),
        note: str(input.note ?? "", "note", 2000),
      };
    case "flag_duplicate_invoice":
      return {
        type,
        invoiceId: str(input.invoiceId, "invoiceId", 40),
        duplicateOfId: str(input.duplicateOfId, "duplicateOfId", 40),
      };
    case "create_ticket":
      return {
        type,
        ticketId: str(input.ticketId, "ticketId", 40),
        title: str(input.title, "title", 200),
        customer: str(input.customer, "customer", 200),
        priority: str(input.priority ?? "normal", "priority", 10) as "low" | "normal" | "high",
        dueDay: int(input.dueDay, "dueDay", 0, 1000),
        note: str(input.note ?? "", "note", 2000),
      };
    case "update_ticket":
      return {
        type,
        ticketId: str(input.ticketId, "ticketId", 40),
        status: optStr(input.status, "status", 20) as
          | "open"
          | "in_progress"
          | "waiting"
          | "resolved"
          | "closed"
          | null,
        note: str(input.note ?? "", "note", 2000),
        reference: optStr(input.reference, "reference", 60),
        commitment:
          input.commitment === undefined || input.commitment === null
            ? null
            : (() => {
                const c = input.commitment as Raw;
                return {
                  promisedDay: int(c.promisedDay, "commitment.promisedDay", 0, 1000),
                  text: str(c.text ?? "", "commitment.text", 500),
                };
              })(),
      };
    case "send_message":
      return {
        type,
        messageId: str(input.messageId, "messageId", 60),
        to: str(input.to, "to", 200),
        subject: str(input.subject, "subject", 200),
        body: str(input.body, "body", 5000),
        relatedTo: optStr(input.relatedTo, "relatedTo", 60),
        commitment:
          input.commitment === undefined || input.commitment === null
            ? null
            : (() => {
                const c = input.commitment as Raw;
                return {
                  promisedDay: int(c.promisedDay, "commitment.promisedDay", 0, 1000),
                  text: str(c.text ?? "", "commitment.text", 500),
                };
              })(),
      };
    case "update_spreadsheet":
      return {
        type,
        workbookId: str(input.workbookId, "workbookId", 40),
        cells: (Array.isArray(input.cells) ? input.cells : []).slice(0, 200).map((c, i) => {
          const raw = c as Raw;
          const cell: { ref: string; value: number | string; formula?: string } = {
            ref: str(raw.ref, `cells[${i}].ref`, 10),
            value:
              typeof raw.value === "number"
                ? int(raw.value, `cells[${i}].value`, -100_000_000)
                : str(raw.value ?? "", `cells[${i}].value`, 500),
          };
          if (raw.formula !== undefined && raw.formula !== null && raw.formula !== "") {
            cell.formula = str(raw.formula, `cells[${i}].formula`, 200);
          }
          return cell;
        }),
      };
    case "add_work_note":
      return { type, text: str(input.text, "text", 2000) };
    case "request_help":
      return { type, question: str(input.question, "question", 1000) };
    case "submit_work":
      return { type, summary: str(input.summary ?? "", "summary", 5000) };
    default:
      throw new Error(`unknown action type ${type}`);
  }
}
