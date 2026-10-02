"use client";

import { useState } from "react";
import type { Observation } from "../../domain/observation.ts";
import { Button, Card, Empty, Field, StatusTag, Tag, formatMinor, inputClass } from "./ui.tsx";

type Act = (payload: Record<string, unknown>) => Promise<void>;

interface PanelProps {
  obs: Observation;
  act: Act;
}



export function SuppliersPanel({ obs }: PanelProps) {
  return (
    <div className="space-y-4">
      {Object.values(obs.suppliers).map((s) => (
        <Card key={s.id} title={s.name}>
          <p className="text-sm text-slate-600">
            Lead time <strong>{s.leadTimeDays} days</strong> · Terms{" "}
            <strong>net {s.paymentTermsDays}</strong>
          </p>
          <ul className="mt-2 divide-y divide-slate-100">
            {s.catalog.map((c) => (
              <li key={c.itemId} className="flex items-center justify-between py-1.5 text-sm">
                <span>
                  {obs.items[c.itemId]?.name ?? c.itemId}{" "}
                  <span className="text-slate-500">({c.itemId})</span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatMinor(c.unitPriceMinor, obs.policy.currency)} / {obs.items[c.itemId]?.unit}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function InboxPanel({ obs, act }: PanelProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [relatedTo, setRelatedTo] = useState("");
  const [promiseDay, setPromiseDay] = useState("");

  return (
    <div className="space-y-4">
      <Card title={`Messages (${obs.inbox.length})`}>
        <ul className="space-y-3">
          {[...obs.inbox].reverse().map((m) => (
            <li key={m.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Tag tone={m.direction === "in" ? "info" : "ok"}>{m.direction === "in" ? "received" : "sent"}</Tag>
                <span>Day {Math.floor(m.atMinute / 1440)}</span>
                <span>
                  {m.from} → {m.to}
                </span>
                {m.relatedTo ? <span className="font-mono">{m.relatedTo}</span> : null}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{m.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
              {m.commitment ? (
                <p className="mt-1 text-xs text-amber-700">
                  Commitment: {m.commitment.text} (day {m.commitment.promisedDay})
                </p>
              ) : null}
            </li>
          ))}
          {obs.inbox.length === 0 ? <Empty>The inbox is empty.</Empty> : null}
        </ul>
      </Card>

      <Card title="Compose message">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="To">
            <input className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Customer or supplier" />
          </Field>
          <Field label="Related to (ticket / PO / invoice id)">
            <input className={inputClass} value={relatedTo} onChange={(e) => setRelatedTo(e.target.value)} placeholder="e.g. TCK-101" />
          </Field>
          <Field label="Subject">
            <input className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Promised day (optional commitment)" hint="A promise is a commitment — only dates you can actually source.">
            <input className={inputClass} value={promiseDay} onChange={(e) => setPromiseDay(e.target.value)} placeholder="e.g. 8" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Body">
          <textarea className={inputClass} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <div className="mt-2">
          <Button
            onClick={() =>
              act({
                type: "send_message",
                messageId: `MSG-${Date.now()}`,
                to,
                subject,
                body,
                relatedTo: relatedTo || null,
                commitment: promiseDay
                  ? { promisedDay: Number(promiseDay), text: subject || "customer promise" }
                  : null,
              })
            }
          >
            Send message
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function OrdersPanel({ obs, act }: PanelProps) {
  const [supplierId, setSupplierId] = useState("SUP-KETTLE");
  const [l1, setL1] = useState({ itemId: "GLV-100", qty: "" });
  const [l2, setL2] = useState({ itemId: "SAF-220", qty: "" });
  const [l3, setL3] = useState({ itemId: "FST-550", qty: "" });
  const [reqDay, setReqDay] = useState("");
  const [note, setNote] = useState("");
  const [amendOpen, setAmendOpen] = useState<string | null>(null);

  const supplier = obs.suppliers[supplierId];

  return (
    <div className="space-y-4">
      <Card title="Purchase orders">
        <ul className="space-y-3">
          {Object.values(obs.purchaseOrders).map((po) => (
            <li key={po.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{po.id}</span>
                <StatusTag status={po.status} />
                <span className="text-xs text-slate-500">
                  {obs.suppliers[po.supplierId]?.name} · wants day {po.requestedDeliveryDay} · lead{" "}
                  {obs.suppliers[po.supplierId]?.leadTimeDays}d
                </span>
                {po.managerApproved ? <Tag tone="ok">manager approved</Tag> : null}
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {po.lines.map((l) => (
                  <li key={l.itemId} className="flex justify-between">
                    <span>
                      {l.qty} × {obs.items[l.itemId]?.name ?? l.itemId}
                    </span>
                    <span className="tabular-nums">
                      {formatMinor(l.qty * l.unitPriceMinor, obs.policy.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              {po.amendments.length > 0 ? (
                <p className="mt-1 text-xs text-slate-500">
                  {po.amendments.length} amendment(s) recorded (history preserved)
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-2">
                {po.status === "draft" ? (
                  <>
                    <Button onClick={() => act({ type: "submit_purchase_order", poId: po.id })}>Submit</Button>
                    <Button variant="danger" onClick={() => act({ type: "cancel_purchase_order", poId: po.id, reason: "not needed" })}>
                      Cancel
                    </Button>
                  </>
                ) : null}
                {po.status === "submitted" ? (
                  <>
                    <Button onClick={() => act({ type: "request_approval", poId: po.id })}>Request approval</Button>
                    <Button onClick={() => act({ type: "authorize_purchase_order", poId: po.id })}>Authorize</Button>
                    <Button variant="danger" onClick={() => act({ type: "cancel_purchase_order", poId: po.id, reason: "not needed" })}>
                      Cancel
                    </Button>
                  </>
                ) : null}
                {po.status === "pending_approval" ? (
                  <Button onClick={() => act({ type: "authorize_purchase_order", poId: po.id })}>Authorize</Button>
                ) : null}
                {["authorized", "partially_received"].includes(po.status) ? (
                  <>
                    <Button variant="secondary" onClick={() => setAmendOpen(amendOpen === po.id ? null : po.id)}>
                      Amend
                    </Button>
                    <Button variant="danger" onClick={() => act({ type: "cancel_purchase_order", poId: po.id, reason: "plans changed" })}>
                      Cancel order
                    </Button>
                  </>
                ) : null}
              </div>
              {amendOpen === po.id ? (
                <AmendForm
                  po={po}
                  obs={obs}
                  onClose={() => setAmendOpen(null)}
                  act={act}
                />
              ) : null}
            </li>
          ))}
          {Object.keys(obs.purchaseOrders).length === 0 ? <Empty>No orders yet — draft the first one below.</Empty> : null}
        </ul>
      </Card>

      <Card title="New purchase order">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Supplier">
            <select
              className={inputClass}
              value={supplierId}
              aria-label="Order supplier"
              onChange={(e) => setSupplierId(e.target.value)}
            >
              {Object.values(obs.suppliers).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (lead {s.leadTimeDays}d)
                </option>
              ))}
            </select>
          </Field>
          <Field label="Requested delivery day" hint={`Supplier lead time is ${supplier?.leadTimeDays ?? "?"} days.`}>
            <input className={inputClass} value={reqDay} onChange={(e) => setReqDay(e.target.value)} inputMode="numeric" />
          </Field>
          {[l1, l2, l3].map((line, i) => (
            <Field key={i} label={`Line ${i + 1} (item + qty)`} hint={i === 2 ? "Leave qty blank to skip." : undefined}>
              <div className="flex gap-2">
                <select
                  className={inputClass}
                  value={line.itemId}
                  aria-label={`Line ${i + 1} item`}
                  onChange={(e) =>
                    [setL1, setL2, setL3][i]!({ ...line, itemId: e.target.value })
                  }
                >
                  {(supplier?.catalog ?? []).map((c) => (
                    <option key={c.itemId} value={c.itemId}>
                      {c.itemId} @ {c.unitPriceMinor}
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputClass} w-24`}
                  value={line.qty}
                  onChange={(e) => [setL1, setL2, setL3][i]!({ ...line, qty: e.target.value })}
                  placeholder="qty"
                  inputMode="numeric"
                  aria-label={`Line ${i + 1} quantity`}
                />
              </div>
            </Field>
          ))}
        </div>
        <Field label="Note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-2">
          <Button
            onClick={() => {
              const entries = [l1, l2, l3]
                .filter((l) => l.qty !== "")
                .map((l) => ({
                  itemId: l.itemId,
                  qty: Number(l.qty),
                  unitPriceMinor: supplier?.catalog.find((c) => c.itemId === l.itemId)?.unitPriceMinor ?? 1,
                }));
              act({
                type: "draft_purchase_order",
                poId: `PO-${Date.now()}`,
                supplierId,
                lines: entries,
                requestedDeliveryDay: Number(reqDay || obs.day + (supplier?.leadTimeDays ?? 3)),
                note,
              });
            }}
          >
            Draft order
          </Button>
        </div>
      </Card>
    </div>
  );
}

function AmendForm({
  po,
  obs,
  act,
  onClose,
}: {
  po: Observation["purchaseOrders"][string];
  obs: Observation;
  act: Act;
  onClose: () => void;
}) {
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [addItemId, setAddItemId] = useState(Object.keys(obs.items)[0] ?? "");
  const [addQty, setAddQty] = useState("");
  const [removeId, setRemoveId] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="mt-3 rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Amend {po.id}</p>
      <ul className="mt-2 space-y-1">
        {po.lines.map((l) => (
          <li key={l.itemId} className="flex items-center gap-2 text-sm">
            <span className="w-24 font-mono">{l.itemId}</span>
            <span className="w-14 text-slate-500">qty {l.qty}</span>
            <input
              className={`${inputClass} w-20`}
              placeholder="new qty"
              value={qtys[l.itemId] ?? ""}
              onChange={(e) => setQtys({ ...qtys, [l.itemId]: e.target.value })}
              aria-label={`New quantity for ${l.itemId}`}
            />
            <Button variant="ghost" onClick={() => setRemoveId(l.itemId)}>
              mark remove
            </Button>
            {removeId === l.itemId ? <Tag tone="bad">will remove</Tag> : null}
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Field label="Add line">
          <div className="flex gap-2">
            <select
              className={inputClass}
              value={addItemId}
              aria-label="Amendment item"
              onChange={(e) => setAddItemId(e.target.value)}
            >
              {Object.keys(obs.items).map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
            <input
              className={`${inputClass} w-20`}
              placeholder="qty"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              aria-label="Added line quantity"
            />
          </div>
        </Field>
        <Field label="Amendment note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
      <div className="mt-2 flex gap-2">
        <Button
          onClick={() => {
            const supplier = obs.suppliers[po.supplierId];
            const price = supplier?.catalog.find((c) => c.itemId === addItemId)?.unitPriceMinor ?? 1;
            act({
              type: "amend_purchase_order",
              poId: po.id,
              addLines: addQty ? [{ itemId: addItemId, qty: Number(addQty), unitPriceMinor: price }] : [],
              removeLines: removeId ? [removeId] : [],
              qtyChanges: Object.entries(qtys)
                .filter(([, v]) => v !== "")
                .map(([itemId, v]) => ({ itemId, newQty: Number(v) })),
              note: note || "amendment",
            });
            onClose();
          }}
        >
          Apply amendment
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

export function DeliveriesPanel({ obs, act }: PanelProps) {
  return (
    <Card title="Deliveries">
      <ul className="space-y-3">
        {Object.values(obs.deliveries).map((d) => (
          <li key={d.id} className="rounded-md border border-slate-100 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{d.id}</span>
              <StatusTag status={d.status} />
              <span className="text-xs text-slate-500">
                for {d.poId} · arrived day {Math.floor(d.arrivedAtMinute / 1440)}
              </span>
            </div>
            <ul className="mt-1 text-sm">
              {d.lines.map((l) => (
                <li key={l.itemId}>
                  {l.qty} × {l.itemId}
                  {l.substituteFor ? ` (substitute for ${l.substituteFor})` : ""}
                </li>
              ))}
            </ul>
            {d.carrierNote ? <p className="mt-1 text-xs text-amber-700">Carrier: {d.carrierNote}</p> : null}
            {d.status === "arrived" ? (
              <div className="mt-2">
                <Button
                  onClick={() =>
                    act({
                      type: "record_delivery",
                      deliveryId: d.id,
                      verifiedLines: d.lines.map((l) => ({
                        itemId: l.itemId,
                        qty: l.qty,
                        ...(l.substituteFor ? { substituteFor: l.substituteFor } : {}),
                      })),
                      note: "checked against carrier record",
                    })
                  }
                >
                  Check in delivery
                </Button>
                <p className="mt-1 text-xs text-slate-500">
                  Verifies exactly what the carrier delivered. Mismatches are rejected and recorded.
                </p>
              </div>
            ) : null}
          </li>
        ))}
        {Object.keys(obs.deliveries).length === 0 ? <Empty>No deliveries yet.</Empty> : null}
      </ul>
    </Card>
  );
}

export function InvoicesPanel({ obs, act }: PanelProps) {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [payDays, setPayDays] = useState<Record<string, string>>({});

  return (
    <div className="space-y-4">
      <Card title="Invoices">
        <ul className="space-y-3">
          {Object.values(obs.invoices).map((inv) => (
            <li key={inv.id} className="rounded-md border border-slate-100 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{inv.invoiceNumber}</span>
                <StatusTag status={inv.status} />
                <span className="text-sm tabular-nums">
                  {formatMinor(inv.amountMinor, inv.currency)} · due day {inv.dueDay}
                </span>
                {inv.currency !== obs.policy.currency ? <Tag tone="bad">currency {inv.currency}</Tag> : null}
                {inv.duplicateOfId ? <Tag tone="bad">duplicate of {inv.duplicateOfId}</Tag> : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {inv.supplierId} · PO {inv.poId ?? "—"} · delivery {inv.deliveryId ?? "not matched"}
                {inv.adjustedAmountMinor !== null
                  ? ` · approved ${formatMinor(inv.adjustedAmountMinor, obs.policy.currency)}`
                  : ""}
              </p>
              <ul className="mt-1 text-sm">
                {inv.lines.map((l) => (
                  <li key={l.itemId}>
                    {l.qty} × {l.itemId} @ {l.unitPriceMinor}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                {inv.status === "received" ? (
                  <>
                    <Field label="Match to delivery">
                      <select
                        className={inputClass}
                        aria-label={`Delivery for ${inv.invoiceNumber}`}
                        onChange={(e) => {
                          const deliveryId = e.target.value;
                          if (deliveryId) {
                            act({
                              type: "match_invoice",
                              invoiceId: inv.id,
                              poId: inv.poId,
                              deliveryId,
                            });
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">choose…</option>
                        {Object.values(obs.deliveries)
                          .filter((d) => d.status === "checked_in")
                          .map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.id} ({d.poId})
                            </option>
                          ))}
                      </select>
                    </Field>
                    <Field label="Flag duplicate of">
                      <select
                        className={inputClass}
                        aria-label={`Duplicate of for ${inv.invoiceNumber}`}
                        onChange={(e) => {
                          const other = e.target.value;
                          if (other) act({ type: "flag_duplicate_invoice", invoiceId: inv.id, duplicateOfId: other });
                        }}
                        defaultValue=""
                      >
                        <option value="">choose…</option>
                        {Object.values(obs.invoices)
                          .filter((i) => i.id !== inv.id)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.invoiceNumber}
                            </option>
                          ))}
                      </select>
                    </Field>
                  </>
                ) : null}
                {inv.status === "matched" ? (
                  <>
                    <Field label="Approved amount (blank = billed)" hint="Settle delivered value only (policy P5).">
                      <input
                        className={`${inputClass} w-32`}
                        value={amounts[inv.id] ?? ""}
                        onChange={(e) => setAmounts({ ...amounts, [inv.id]: e.target.value })}
                        inputMode="numeric"
                        aria-label={`Approved amount for ${inv.invoiceNumber}`}
                      />
                    </Field>
                    <Button
                      onClick={() =>
                        act({
                          type: "approve_invoice",
                          invoiceId: inv.id,
                          adjustedAmountMinor: amounts[inv.id] ? Number(amounts[inv.id]) : null,
                          note: "approved after match",
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => act({ type: "dispute_invoice", invoiceId: inv.id, reason: "discrepancy", note: "see supplier message" })}
                    >
                      Dispute
                    </Button>
                  </>
                ) : null}
                {inv.status === "approved" ? (
                  <>
                    <Field label="Pay day">
                      <input
                        className={`${inputClass} w-24`}
                        value={payDays[inv.id] ?? String(obs.day + 7)}
                        onChange={(e) => setPayDays({ ...payDays, [inv.id]: e.target.value })}
                        inputMode="numeric"
                        aria-label={`Pay day for ${inv.invoiceNumber}`}
                      />
                    </Field>
                    <Button
                      onClick={() =>
                        act({
                          type: "schedule_payment",
                          invoiceId: inv.id,
                          payDay: Number(payDays[inv.id] ?? obs.day + 7),
                        })
                      }
                    >
                      Schedule payment
                    </Button>
                  </>
                ) : null}
                {inv.status === "scheduled" ? (
                  <Button onClick={() => act({ type: "run_payment_run", payDay: inv.dueDay, invoiceIds: [inv.id] })}>
                    Run payment (once)
                  </Button>
                ) : null}
                {["received", "matched"].includes(inv.status) ? (
                  <Button
                    variant="danger"
                    onClick={() => act({ type: "dispute_invoice", invoiceId: inv.id, reason: "discrepancy", note: "holding settlement" })}
                  >
                    Hold / dispute
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
          {Object.keys(obs.invoices).length === 0 ? <Empty>No invoices yet.</Empty> : null}
        </ul>
      </Card>
    </div>
  );
}

export function LedgerPanel({ obs }: PanelProps) {
  return (
    <div className="space-y-4">
      <Card title="Balances">
        <ul className="grid gap-2 sm:grid-cols-2">
          {Object.entries({
            Cash: obs.ledger.opening.cash,
            "Accounts receivable": obs.ledger.opening.accounts_receivable,
            Inventory: obs.ledger.opening.inventory,
            "Accounts payable": obs.ledger.opening.accounts_payable,
          }).map(([k, v]) => (
            <li key={k} className="flex justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
              <span>{k} (opening)</span>
              <span className="tabular-nums">{formatMinor(v, obs.policy.currency)}</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Transactions">
        <ul className="space-y-2">
          {obs.ledger.txns.map((t) => (
            <li key={t.id} className="rounded-md border border-slate-100 p-2 text-sm">
              <div className="flex justify-between">
                <span className="font-mono text-xs">{t.id}</span>
                <span className="text-xs text-slate-500">day {Math.floor(t.atMinute / 1440)}</span>
              </div>
              <p className="text-slate-600">{t.memo}</p>
              <ul className="mt-1 grid gap-1 sm:grid-cols-2">
                {t.entries.map((e, i) => (
                  <li key={i} className="flex justify-between text-xs">
                    <span>{e.account}</span>
                    <span className="tabular-nums">
                      {e.debitMinor ? `D ${formatMinor(e.debitMinor, obs.policy.currency)}` : `C ${formatMinor(e.creditMinor, obs.policy.currency)}`}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {obs.ledger.txns.length === 0 ? <Empty>No transactions yet.</Empty> : null}
        </ul>
      </Card>
    </div>
  );
}

export function TicketsPanel({ obs, act }: PanelProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [promiseDay, setPromiseDay] = useState<Record<string, string>>({});

  return (
    <Card title="Ticket board">
      <ul className="space-y-4">
        {Object.values(obs.tickets).map((t) => (
          <li key={t.id} className="rounded-md border border-slate-100 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{t.id}</span>
              <StatusTag status={t.status} />
              <Tag tone={t.priority === "high" ? "warn" : "info"}>{t.priority}</Tag>
              <span className="text-xs text-slate-500">
                {t.customer} · due day {t.dueDay}
              </span>
            </div>
            <p className="mt-1 text-sm font-medium">{t.title}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {t.notes.slice(-3).map((n, i) => (
                <li key={i}>
                  <span className="text-slate-400">day {Math.floor(n.atMinute / 1440)}:</span> {n.text}
                  {n.reference ? <span className="font-mono text-slate-400"> [{n.reference}]</span> : null}
                </li>
              ))}
            </ul>
            {t.commitments.length > 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                Commitments: {t.commitments.map((c) => `day ${c.promisedDay} — ${c.text}`).join(" · ")}
              </p>
            ) : null}
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Field label="Update note">
                <input
                  className={inputClass}
                  value={notes[t.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
                  aria-label={`Note for ${t.id}`}
                />
              </Field>
              <Field label="Reference (PO / delivery / invoice id)">
                <input
                  className={inputClass}
                  value={refs[t.id] ?? ""}
                  onChange={(e) => setRefs({ ...refs, [t.id]: e.target.value })}
                  placeholder="e.g. PO-2210"
                  aria-label={`Reference for ${t.id}`}
                />
              </Field>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={statuses[t.id] ?? t.status}
                  onChange={(e) => setStatuses({ ...statuses, [t.id]: e.target.value })}
                  aria-label={`Status for ${t.id}`}
                >
                  {["open", "in_progress", "waiting", "resolved", "closed"].map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Revised promise day (optional)">
                <input
                  className={inputClass}
                  value={promiseDay[t.id] ?? ""}
                  onChange={(e) => setPromiseDay({ ...promiseDay, [t.id]: e.target.value })}
                  placeholder="e.g. 8"
                  inputMode="numeric"
                  aria-label={`Promise day for ${t.id}`}
                />
              </Field>
            </div>
            <div className="mt-2">
              <Button
                onClick={() =>
                  act({
                    type: "update_ticket",
                    ticketId: t.id,
                    status: (statuses[t.id] ?? t.status) as never,
                    note: notes[t.id] ?? "updated",
                    reference: refs[t.id] || null,
                    commitment: promiseDay[t.id]
                      ? { promisedDay: Number(promiseDay[t.id]), text: "revised commitment" }
                      : null,
                  })
                }
              >
                Update ticket
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function SheetsPanel({ obs, act }: PanelProps) {
  const workbookId = Object.keys(obs.workbooks)[0] ?? "";
  const wb = obs.workbooks[workbookId];
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [newRef, setNewRef] = useState("");

  if (!wb) {
    return <Empty>This episode has no spreadsheet artifact.</Empty>;
  }

  const refs = Array.from(
    new Set([...Object.keys(wb.cells), ...Object.keys(draft)]),
  ).sort((a, b) => {
    const [ac, ar] = [a.replace(/[0-9]/g, ""), Number(a.replace(/[^0-9]/g, ""))];
    const [bc, br] = [b.replace(/[0-9]/g, ""), Number(b.replace(/[^0-9]/g, ""))];
    return ar - br || (ac < bc ? -1 : 1);
  });

  return (
    <Card
      title={`${wb.name} (${wb.id})`}
      actions={
        <Button
          variant="secondary"
          onClick={() => {
            const blob = new Blob([refs.map((r) => `${r},${csvCell(sanitize(renderCell(wb.cells[r])))}`).join("\n")], {
              type: "text/csv",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${wb.id}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export CSV (sanitized)
        </Button>
      }
    >
      <p className="mb-2 text-xs text-slate-500">
        Formulas: =SUM(A1:A5), =AVG(...), =MIN(...), =MAX(...), arithmetic and cell refs. Type
        &quot;=&quot; to start a formula. {wb.edits.length} edits recorded (history preserved).
      </p>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {refs.map((ref) => (
          <li key={ref} className="flex items-center gap-2">
            <span className="w-10 font-mono text-xs text-slate-500">{ref}</span>
            <input
              className={inputClass}
              value={draft[ref] ?? renderCell(wb.cells[ref])}
              onChange={(e) => setDraft({ ...draft, [ref]: e.target.value })}
              aria-label={`Cell ${ref}`}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Button
          onClick={() => {
            const cells = Object.entries(draft).map(([ref, raw]) => {
              if (raw.startsWith("=")) return { ref, value: "", formula: raw.slice(1) };
              const n = Number(raw);
              return { ref, value: Number.isFinite(n) && raw.trim() !== "" ? n : raw };
            });
            act({ type: "update_spreadsheet", workbookId, cells });
            setDraft({});
          }}
        >
          Save cells
        </Button>
        <Field label="Add cell (e.g. C3)">
          <div className="flex gap-2">
            <input
              className={`${inputClass} w-24`}
              value={newRef}
              onChange={(e) => setNewRef(e.target.value.toUpperCase())}
              aria-label="New cell reference"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (/^[A-Z]{1,2}[1-9][0-9]?$/.test(newRef)) {
                  setDraft({ ...draft, [newRef]: draft[newRef] ?? "" });
                  setNewRef("");
                } else {
                  setDraft({ ...draft }); // invalid ref: keep UI responsive
                  setNewRef("");
                }
              }}
            >
              Add cell
            </Button>
          </div>
        </Field>
      </div>
    </Card>
  );
}

function renderCell(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object" && "formula" in (v as Record<string, unknown>)) {
    return `=${(v as { formula: string }).formula}`;
  }
  return String(v);
}

function sanitize(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value.replace(/[\u0000-\u001f]/g, "");
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function NotesPanel({ obs, act }: PanelProps) {
  const [note, setNote] = useState("");
  const [question, setQuestion] = useState("");
  return (
    <div className="space-y-4">
      <Card title="Work notes">
        <ul className="space-y-1 text-sm">
          {obs.workNotes.map((n, i) => (
            <li key={i}>
              <span className="text-slate-400">day {Math.floor(n.atMinute / 1440)}:</span> {n.text}
            </li>
          ))}
          {obs.workNotes.length === 0 ? <Empty>No notes yet.</Empty> : null}
        </ul>
        <Field label="Add note">
          <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="mt-2">
          <Button
            onClick={() => {
              act({ type: "add_work_note", text: note });
              setNote("");
            }}
          >
            Add note
          </Button>
        </div>
      </Card>
      <Card title={`Request help (${obs.helpRequests.length} used)`}>
        <p className="text-xs text-slate-500">
          Policy limit: {obs.policy.helpPolicy.maxHelpRequests} requests
          {obs.policy.helpPolicy.fatalBeyond ? " — beyond that is a policy failure" : ""}.
        </p>
        <Field label="Question for the manager">
          <input className={inputClass} value={question} onChange={(e) => setQuestion(e.target.value)} />
        </Field>
        <div className="mt-2">
          <Button
            variant="secondary"
            onClick={() => {
              act({ type: "request_help", question });
              setQuestion("");
            }}
          >
            Request help
          </Button>
        </div>
      </Card>
    </div>
  );
}
