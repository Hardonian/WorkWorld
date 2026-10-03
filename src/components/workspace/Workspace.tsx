"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { SimulationHUD } from "./SimulationHUD.tsx";
import { CommandPalette } from "../ui/CommandPalette.tsx";
import { KeyboardShortcutsModal } from "../ui/KeyboardShortcutsModal.tsx";
import { AuditDrawer } from "./AuditDrawer.tsx";
import { ReconciliationVisualizer } from "./ReconciliationVisualizer.tsx";
import { ToastProvider, useToast } from "../ui/Toast.tsx";
import { useKeyboardShortcuts } from "../ui/useKeyboardShortcuts.ts";
import { closingBalances } from "../../domain/ledger.ts";

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

function WorkspaceContent() {
  const [obs, setObs] = useState<Observation | null>(null);
  const [tab, setTab] = useState<TabId>("brief");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitSummary, setSubmitSummary] = useState("");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isAuditDrawerOpen, setIsAuditDrawerOpen] = useState(false);
  const [isAdvancingTime, setIsAdvancingTime] = useState(false);
  const [splitTab, setSplitTab] = useState<TabId | null>(null);

  const { addToast } = useToast();

  useEffect(() => {
    fetch("/api/session")
      .then((r) => r.json())
      .then((d) => {
        setObs(d.observation);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const act = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      try {
        const res = await fetch("/api/actions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.observation) setObs(data.observation);

        const errMessages = (data.errors ?? [])
          .map((e: { message: string }) => e.message)
          .join("; ");
        const feedbackText = data.ok
          ? data.feedback || "Done."
          : `Rejected: ${errMessages || data.error || "Request could not be applied."}`;

        setFeedback({
          kind: data.ok ? "ok" : "error",
          text: feedbackText,
        });

        if (data.ok) {
          addToast({
            type: "success",
            title: "Action Executed",
            message: data.feedback || `${String(payload.type).replace(/_/g, " ")} completed successfully.`,
          });
        } else {
          addToast({
            type: "policy",
            title: "Action Rejected by Policy",
            message: errMessages || "Operation disallowed under current scenario policies.",
          });
        }
        return res.ok && data.ok === true;
      } catch (err: unknown) {
        const errorText = err instanceof Error ? err.message : "Failed to execute action.";
        setFeedback({ kind: "error", text: errorText });
        addToast({
          type: "error",
          title: "Network Error",
          message: errorText,
        });
        return false;
      }
    },
    [addToast]
  );

  const handleAdvanceTime = useCallback(
    async (minutes: number) => {
      setIsAdvancingTime(true);
      try {
        await act({ type: "advance_time", minutes });
      } finally {
        setIsAdvancingTime(false);
      }
    },
    [act]
  );

  const handleSelectTabIndex = useCallback((idx: number) => {
    const targetTab = TABS[idx];
    if (targetTab) {
      setTab(targetTab.id);
    }
  }, []);

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenShortcutsHelp: () => setIsShortcutsOpen(true),
    onAdvanceTime: (mins) => handleAdvanceTime(mins),
    onSelectTab: (idx) => handleSelectTabIndex(idx),
    onCloseModals: () => {
      setIsCommandPaletteOpen(false);
      setIsShortcutsOpen(false);
      setIsAuditDrawerOpen(false);
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-slate-500 dark:text-slate-400" role="status">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span>Loading workspace session…</span>
        </div>
      </div>
    );
  }

  if (!obs) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">No active episode</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Your workspace is empty (a new session, a finished episode, or stored state that failed
          verification — prior evidence is preserved in the store).
        </p>
        <p className="mt-4">
          <Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors">
            Choose an episode
          </Link>
        </p>
      </div>
    );
  }

  // Calculate HUD metrics
  const inboundMessageCount = obs.inbox.filter((m) => m.direction === "in").length;
  const pendingPoCount = Object.values(obs.purchaseOrders).filter(
    (p) => p.status === "draft" || p.status === "pending_approval"
  ).length;
  const pendingDeliveryCount = Object.values(obs.deliveries).filter((d) => d.status === "arrived").length;

  const balances = closingBalances(obs.ledger.opening, obs.ledger.txns);
  const openingEquityMinor =
    obs.ledger.opening.cash +
    obs.ledger.opening.accounts_receivable +
    obs.ledger.opening.inventory -
    obs.ledger.opening.accounts_payable;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-12">
      {/* Top Simulation HUD */}
      <SimulationHUD
        scenarioId={obs.scenarioId}
        contextLabel={obs.brief.role}
        minute={obs.clockMinute}
        cashMinor={balances.cash}
        budgetCommittedMinor={obs.budget.committedMinor}
        budgetLimitMinor={obs.policy.budgetMinor}
        inboundMessageCount={inboundMessageCount}
        pendingPoCount={pendingPoCount}
        pendingDeliveryCount={pendingDeliveryCount}
        revision={obs.revision}
        onAdvanceTime={handleAdvanceTime}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenAuditDrawer={() => setIsAuditDrawerOpen(true)}
        isAdvancing={isAdvancingTime}
      />

      {feedback ? (
        <div className="mx-auto max-w-7xl px-4 pt-4">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-md border px-4 py-2 text-sm ${
              feedback.kind === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-200"
                : "border-rose-200 bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-200"
            }`}
          >
            {feedback.text}
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-6">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
              {obs.brief.company} · {obs.brief.role} · {obs.scenarioId}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {obs.episodeTitle}{" "}
              <span className="text-slate-400 dark:text-slate-500 font-normal">
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
              onClick={() => handleAdvanceTime(1440)}
              disabled={obs.status !== "active" || isAdvancingTime}
            >
              Advance 1 day
            </Button>
            <button
              type="button"
              onClick={() => setSplitTab(splitTab ? null : tab === "orders" ? "invoices" : "orders")}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
                splitTab
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              }`}
              title="Compare modules side-by-side"
            >
              {splitTab ? "Close split" : "Split view"}
            </button>
          </div>
        </header>

        {/* Mobile / Tablet Horizontal Navigation Bar */}
        <div className="lg:hidden mb-4 flex gap-1.5 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.id
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr_320px]">
          {/* Navigation Sidebar */}
          <nav aria-label="Workspace sections" className="flex flex-wrap gap-1 lg:flex-col">
            {TABS.map((t, idx) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                aria-label={t.label}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span>{t.label}</span>
                <span
                  aria-hidden="true"
                  className={`text-[10px] opacity-60 ${tab === t.id ? "text-white" : "text-slate-400"}`}
                >
                  {idx + 1}
                </span>
              </button>
            ))}
          </nav>

          {/* Main Module Content */}
          <main>
            {splitTab ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <span>Primary: {TABS.find((t) => t.id === tab)?.label}</span>
                  </div>
                  {tab === "brief" ? (
                    <Card title="Episode brief">
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{obs.brief.situation}</p>
                      <h3 className="mt-4 text-sm font-semibold">Objectives</h3>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {obs.brief.objectives.map((o) => (
                          <li key={o}>{o}</li>
                        ))}
                      </ul>
                      <h3 className="mt-4 text-sm font-semibold">Guidance</h3>
                      <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                        {obs.brief.guidance.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </Card>
                  ) : null}
                  {tab === "inbox" ? <InboxPanel obs={obs} act={act} /> : null}
                  {tab === "suppliers" ? <SuppliersPanel obs={obs} act={act} /> : null}
                  {tab === "orders" ? <OrdersPanel obs={obs} act={act} /> : null}
                  {tab === "deliveries" ? <DeliveriesPanel obs={obs} act={act} /> : null}
                  {tab === "invoices" ? <InvoicesPanel obs={obs} act={act} /> : null}
                  {tab === "ledger" ? (
                    <div className="space-y-6">
                      <ReconciliationVisualizer
                        balances={balances}
                        openingEquityMinor={openingEquityMinor}
                        transactions={obs.ledger.txns}
                        currency={obs.policy.currency}
                      />
                      <LedgerPanel obs={obs} act={act} />
                    </div>
                  ) : null}
                  {tab === "tickets" ? <TicketsPanel obs={obs} act={act} /> : null}
                  {tab === "sheets" ? <SheetsPanel obs={obs} act={act} /> : null}
                  {tab === "notes" ? <NotesPanel obs={obs} act={act} /> : null}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span>Comparison:</span>
                      <select
                        value={splitTab}
                        onChange={(e) => setSplitTab(e.target.value as TabId)}
                        aria-label="Select comparison module"
                        className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {TABS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSplitTab(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  </div>
                  {splitTab === "brief" ? (
                    <Card title="Episode brief">
                      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{obs.brief.situation}</p>
                    </Card>
                  ) : null}
                  {splitTab === "inbox" ? <InboxPanel obs={obs} act={act} /> : null}
                  {splitTab === "suppliers" ? <SuppliersPanel obs={obs} act={act} /> : null}
                  {splitTab === "orders" ? <OrdersPanel obs={obs} act={act} /> : null}
                  {splitTab === "deliveries" ? <DeliveriesPanel obs={obs} act={act} /> : null}
                  {splitTab === "invoices" ? <InvoicesPanel obs={obs} act={act} /> : null}
                  {splitTab === "ledger" ? (
                    <div className="space-y-6">
                      <ReconciliationVisualizer
                        balances={balances}
                        openingEquityMinor={openingEquityMinor}
                        transactions={obs.ledger.txns}
                        currency={obs.policy.currency}
                      />
                      <LedgerPanel obs={obs} act={act} />
                    </div>
                  ) : null}
                  {splitTab === "tickets" ? <TicketsPanel obs={obs} act={act} /> : null}
                  {splitTab === "sheets" ? <SheetsPanel obs={obs} act={act} /> : null}
                  {splitTab === "notes" ? <NotesPanel obs={obs} act={act} /> : null}
                </div>
              </div>
            ) : (
              <>
                {tab === "brief" ? (
                  <Card title="Episode brief">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{obs.brief.situation}</p>
                    <h3 className="mt-4 text-sm font-semibold">Objectives</h3>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {obs.brief.objectives.map((o) => (
                        <li key={o}>{o}</li>
                      ))}
                    </ul>
                    <h3 className="mt-4 text-sm font-semibold">Guidance</h3>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {obs.brief.guidance.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                    <h3 className="mt-4 text-sm font-semibold">Checklist (what “done” involves)</h3>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      {obs.publicChecklist.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                    <h3 className="mt-4 text-sm font-semibold">Rules that bite</h3>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
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
                {tab === "ledger" ? (
                  <div className="space-y-6">
                    <ReconciliationVisualizer
                      balances={balances}
                      openingEquityMinor={openingEquityMinor}
                      transactions={obs.ledger.txns}
                      currency={obs.policy.currency}
                    />
                    <LedgerPanel obs={obs} act={act} />
                  </div>
                ) : null}
                {tab === "tickets" ? <TicketsPanel obs={obs} act={act} /> : null}
                {tab === "sheets" ? <SheetsPanel obs={obs} act={act} /> : null}
                {tab === "notes" ? <NotesPanel obs={obs} act={act} /> : null}
              </>
            )}
          </main>

          {/* Right Sidebar: Assistant, Progress, Outcome */}
          <aside className="space-y-4">
            <AssistantCard act={act} status={obs.status} />

            <Card title="Progress">
              <ul className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
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
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">{obs.submission.summary}</p>
                </div>
              ) : (
                <>
                  <textarea
                    className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-sm"
                    rows={4}
                    value={submitSummary}
                    onChange={(e) => setSubmitSummary(e.target.value)}
                    placeholder="Summarize what you did and what remains."
                    aria-label="Submission summary"
                  />
                  <div className="mt-2">
                    <Button
                      onClick={async () => {
                        const submitted = await act({
                          type: "submit_work",
                          summary: submitSummary || "submitted",
                        });
                        if (!submitted) return;
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Deterministic checks {assessment.counts.t1Passed}/{assessment.counts.t1Total} ·
                  quality never overrides a fatal failure.
                </p>
                <ul className="mt-2 space-y-1.5">
                  {assessment.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-xs">
                      <Tag tone={c.passed ? "ok" : "bad"}>{c.passed ? "pass" : "fail"}</Tag>
                      <span>
                        <span className="font-mono">{c.id}</span>
                        <span className="block text-slate-500 dark:text-slate-400">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{assessment.claimLimits}</p>
              </Card>
            ) : (
              <Card title="Outcome evidence">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Submit your work to see the deterministic outcome evidence. A human assessor’s rubric
                  is recorded separately.
                </p>
              </Card>
            )}

            <Card title="Recent activity">
              <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
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

      {/* Global Modals & Drawers */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectTab={(tabId) => setTab(tabId as TabId)}
        onAdvanceTime={handleAdvanceTime}
        activeScenarioId={obs.scenarioId}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <AuditDrawer
        isOpen={isAuditDrawerOpen}
        onClose={() => setIsAuditDrawerOpen(false)}
        observation={obs}
      />
    </div>
  );
}

export default function Workspace() {
  return (
    <ToastProvider>
      <WorkspaceContent />
    </ToastProvider>
  );
}
