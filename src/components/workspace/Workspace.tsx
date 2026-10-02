"use client";

import { useCallback, useEffect, useState } from "react";
import type { Observation } from "../../domain/observation.ts";
import { Button, Card, Tag, formatMinor } from "./ui.tsx";
import {
  DeliveriesPanel,
  InboxPanel,
  InvoicesPanel,
  LedgerPanel,
  NotesPanel,
  OrdersPanel,
  SheetsPanel,
  SuppliersPanel,
  TicketsPanel,
} from "./panels.tsx";
import AssistantCard from "./AssistantCard.tsx";

type TabId =
  | "brief"
  | "inbox"
  | "suppliers"
  | "orders"
  | "deliveries"
  | "invoices"
  | "ledger"
  | "tickets"
  | "sheets"
  | "notes";

const TABS: { id: TabId; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "inbox", label: "Inbox" },
  { id: "suppliers", label: "Suppliers" },
  { id: "orders", label: "Orders" },
  { id: "deliveries", label: "Deliveries" },
  { id: "invoices", label: "Invoices" },
  { id: "ledger", label: "Ledger" },
  { id: "tickets", label: "Tickets" },
  { id: "sheets", label: "Sheets" },
  { id: "notes", label: "Notes" },
];

interface Assessment {
  outcome: "pass" | "fail";
  checks: { id: string; tier: string; passed: boolean; detail: string }[];
  counts: { t1Total: number; t1Passed: number };
  claimLimits: string;
}

export default function Workspace() {
  const [obs, setObs] = useState<Observation | null>(null);
  const [tab, setTab] = useState<TabId>("brief");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitSummary, setSubmitSummary] = useState("");

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setObs(d.observation);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const act = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/actions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.observation) setObs(data.observation);
    setFeedback({
      kind: data.ok ? "ok" : "error",
      text: data.ok
        ? data.feedback || "Done."
        : `Rejected: ${(data.errors ?? []).map((e: { message: string }) => e.message).join("; ")}`,
    });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500" role="status">
        Loading workspace…
      </div>
    );
  }

  if (!obs) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold">No active episode</h1>
        <p className="mt-2 text-slate-600">
          Your workspace is empty (a new session, a finished episode, or stored state that failed
          verification — prior evidence is preserved in the store).
        </p>
        <p className="mt-4">
          <a href="/" className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            Choose an episode
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            {obs.brief.company} · {obs.brief.role} · {obs.scenarioId}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {obs.episodeTitle}{" "}
            <span className="text-slate-400">
              · Day {obs.day} / logical {obs.clockMinute}m
            </span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tag tone="info">
            budget {formatMinor(obs.budget.committedMinor, obs.policy.currency)} /{" "}
            {formatMinor(obs.budget.limitMinor, obs.policy.currency)}
          </Tag>
          <Tag tone={obs.status === "active" ? "ok" : "warn"}>{obs.status}</Tag>
          <Button
            variant="secondary"
            onClick={() => act({ type: "advance_time", minutes: 1440 })}
            disabled={obs.status !== "active"}
          >
            Advance 1 day
          </Button>
          <Button
            variant="secondary"
            onClick={() => act({ type: "advance_time", minutes: 120 })}
            disabled={obs.status !== "active"}
          >
            +2h
          </Button>
        </div>
      </header>

      {feedback ? (
        <div
          role="status"
          aria-live="polite"
          className={`mb-4 rounded-md border px-4 py-2 text-sm ${
            feedback.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
        <nav aria-label="Workspace sections" className="flex flex-wrap gap-1 lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-left text-sm font-medium ${
                tab === t.id
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <main>
          {tab === "brief" ? (
            <Card title="Episode brief">
              <p className="text-sm leading-relaxed text-slate-700">{obs.brief.situation}</p>
              <h3 className="mt-4 text-sm font-semibold">Objectives</h3>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
                {obs.brief.objectives.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
              <h3 className="mt-4 text-sm font-semibold">Guidance</h3>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
                {obs.brief.guidance.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <h3 className="mt-4 text-sm font-semibold">Checklist (what “done” involves)</h3>
              <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700">
                {obs.publicChecklist.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <h3 className="mt-4 text-sm font-semibold">Rules that bite</h3>
              <p className="text-sm text-slate-700">
                Orders above {formatMinor(obs.policy.approvalThresholdMinor, obs.policy.currency)} need
                manager approval before authorization. Never settle undelivered goods. Duplicated
                invoices must be flagged. Customer promises must be achievable from real sourcing lead
                times. Help is allowed ({obs.policy.helpPolicy.maxHelpRequests} requests
                {obs.policy.helpPolicy.fatalBeyond ? ", beyond that is a policy failure" : ""}).
              </p>
            </Card>
          ) : null}
          {tab === "inbox" ? <InboxPanel obs={obs} act={act} /> : null}
          {tab === "suppliers" ? <SuppliersPanel obs={obs} act={act} /> : null}
          {tab === "orders" ? <OrdersPanel obs={obs} act={act} /> : null}
          {tab === "deliveries" ? <DeliveriesPanel obs={obs} act={act} /> : null}
          {tab === "invoices" ? <InvoicesPanel obs={obs} act={act} /> : null}
          {tab === "ledger" ? <LedgerPanel obs={obs} act={act} /> : null}
          {tab === "tickets" ? <TicketsPanel obs={obs} act={act} /> : null}
          {tab === "sheets" ? <SheetsPanel obs={obs} act={act} /> : null}
          {tab === "notes" ? <NotesPanel obs={obs} act={act} /> : null}
        </main>

        <aside className="space-y-4">
          <AssistantCard act={act} status={obs.status} />
          <Card title="Progress">
            <ul className="space-y-1 text-sm text-slate-700">
              <li>
                Requirements:{" "}
                {obs.requirements.map((r) => `${r.itemId}×${r.qty}`).join(", ") || "see brief"}
                {obs.requirementDueDay ? ` (by day ${obs.requirementDueDay})` : ""}
              </li>
              <li>
                Committed spend: {formatMinor(obs.budget.committedMinor, obs.policy.currency)} (
                {formatMinor(obs.budget.remainingMinor, obs.policy.currency)} left)
              </li>
              <li>Messages: {obs.inbox.length}</li>
              <li>Help requests: {obs.helpRequests.length}</li>
              <li>Recent actions: {obs.recentActions.length ? obs.recentActions.at(-1)?.type : "none"}</li>
            </ul>
          </Card>

          <Card title="Submit work">
            {obs.submission ? (
              <div>
                <Tag tone="ok">submitted</Tag>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{obs.submission.summary}</p>
              </div>
            ) : (
              <>
                <textarea
                  className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                  rows={4}
                  value={submitSummary}
                  onChange={(e) => setSubmitSummary(e.target.value)}
                  placeholder="Summarize what you did and what remains."
                  aria-label="Submission summary"
                />
                <div className="mt-2">
                  <Button
                    onClick={async () => {
                      await act({ type: "submit_work", summary: submitSummary || "submitted" });
                      const res = await fetch("/api/session", { method: "POST" });
                      const data = await res.json();
                      if (data.report) setAssessment(data.report);
                    }}
                  >
                    Submit & view outcome evidence
                  </Button>
                </div>
              </>
            )}
          </Card>

          {assessment ? (
            <Card title={`Outcome evidence — ${assessment.outcome.toUpperCase()}`}>
              <p className="text-xs text-slate-500">
                Deterministic checks {assessment.counts.t1Passed}/{assessment.counts.t1Total} ·
                quality never overrides a fatal failure.
              </p>
              <ul className="mt-2 space-y-1.5">
                {assessment.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-xs">
                    <Tag tone={c.passed ? "ok" : "bad"}>{c.passed ? "pass" : "fail"}</Tag>
                    <span>
                      <span className="font-mono">{c.id}</span>
                      <span className="block text-slate-500">{c.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{assessment.claimLimits}</p>
            </Card>
          ) : (
            <Card title="Outcome evidence">
              <p className="text-sm text-slate-600">
                Submit your work to see the deterministic outcome evidence. A human assessor’s rubric
                is recorded separately.
              </p>
            </Card>
          )}

          <Card title="Recent activity">
            <ul className="space-y-1 text-xs text-slate-600">
              {[...obs.recentActions].reverse().map((a, i) => (
                <li key={i}>
                  <span className="text-slate-400">day {Math.floor(a.atMinute / 1440)}:</span> {a.type}{" "}
                  <Tag tone={a.outcome === "applied" ? "ok" : "bad"}>{a.outcome}</Tag>
                </li>
              ))}
              {obs.recentActions.length === 0 ? <li>No actions yet.</li> : null}
            </ul>
          </Card>
        </aside>
      </div>
    </div>
  );
}
