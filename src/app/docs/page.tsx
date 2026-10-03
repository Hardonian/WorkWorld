import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Methods and API · WorkWorld" };

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              WorkWorld
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Documentation Hub &amp; Developer Guide
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              Open Workspace
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-12">
        {/* Intro Section */}
        <section>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            Architecture &amp; Design
          </span>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">
            Executable Professional-Work Simulations
          </h2>
          <p className="mt-3 text-base text-slate-600 dark:text-slate-400 leading-relaxed">
            WorkWorld is a runtime for persistent, consequential operational work environments where humans, AI agents, and assisted teams operate under the same goals, permitted actions, and policies. It grades actual <strong>business state</strong> (ledgers, quantities, authorizations, commitments), not narrative polish.
          </p>
        </section>

        {/* Section 1: Evaluation Interface */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            1. The Pure Domain Evaluation Interface
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            The core engine is zero-dependency TypeScript running headlessly in CLI runners, unit tests, and the web app:
          </p>
          <div className="rounded-xl bg-slate-900 p-4 text-xs font-mono text-slate-100 overflow-x-auto">
            <pre>{`// Programmatic Episode Lifecycle
const engine = EpisodeEngine.reset(scenario, { runId, seed: 42, condition: "agent" });

// Get authorized observation
const obs = engine.observe();

// Step a typed action
const transition = engine.step({
  type: "draft_purchase_order",
  poId: "PO-101",
  supplierId: "SUP-A",
  lines: [{ itemId: "GLV-100", qty: 4, unitPriceMinor: 2500 }],
  requestedDeliveryDay: 3,
  note: "Restock clinic gloves",
  actionId: "act_1",
  idempotencyKey: "idem_1",
  expectedRevision: 0,
});

// Deterministically grade final outcome
const report = engine.grade();`}</pre>
          </div>
        </section>

        {/* Section 2: Model Context Protocol */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            2. Experimental agent JSON-RPC interface
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            WorkWorld exposes a small JSON-RPC tool subset at <code className="font-mono text-indigo-600 dark:text-indigo-400">/api/mcp</code>. It is intended for local harness integration and is not yet packaged or verified as a drop-in MCP server for third-party hosts:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">observe_state</h4>
              <p className="mt-1 text-slate-500">Fetches unprivileged current workspace observation, unread messages, and catalog.</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">submit_action</h4>
              <p className="mt-1 text-slate-500">Executes typed operations actions against the domain core with policy verification.</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">search_suppliers</h4>
              <p className="mt-1 text-slate-500">Queries approved suppliers by price, unit cost, and lead-time constraints.</p>
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900">
              <h4 className="font-bold text-slate-900 dark:text-slate-100">get_financial_ledger</h4>
              <p className="mt-1 text-slate-500">Inspects double-entry transactions, accruals, and current account balances.</p>
            </div>
          </div>
        </section>

        {/* Section 3: REST API v1 */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              3. Demo REST API v1
            </h3>
            <Link
              href="/api/v1/openapi"
              target="_blank"
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
            >
              OpenAPI 3.1 Spec (JSON) →
            </Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 text-xs font-mono">
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 font-bold mr-3">POST</span>
                <span>/api/v1/episodes</span>
              </div>
              <span className="text-slate-400 font-sans">Start simulation session</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-2 py-0.5 font-bold mr-3">GET</span>
                <span>/api/v1/episodes?sessionId=...</span>
              </div>
              <span className="text-slate-400 font-sans">Fetch active observation</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 font-bold mr-3">POST</span>
                <span>/api/v1/actions</span>
              </div>
              <span className="text-slate-400 font-sans">Submit domain action</span>
            </div>
            <div className="p-3 flex items-center justify-between">
              <div>
                <span className="rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 font-bold mr-3">POST</span>
                <span>/api/v1/evaluations</span>
              </div>
              <span className="text-slate-400 font-sans">Grade session &amp; get report</span>
            </div>
          </div>
        </section>

        {/* Section 4: TypeScript SDK */}
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            4. In-repository TypeScript client
          </h3>
          <div className="rounded-xl bg-slate-900 p-4 text-xs font-mono text-slate-100 overflow-x-auto">
            <pre>{`import { WorkWorldClient } from "@/sdk/client";

const client = new WorkWorldClient({ baseUrl: "http://localhost:3100" });

// 1. Initialize episode
const { sessionId, observation } = await client.startEpisode("A1", { condition: "agent" });

// 2. Draft and authorize PO
await client.draftPo(sessionId, "PO-101", "SUP-A", [{ itemId: "GLV-100", qty: 4, unitPriceMinor: 2500 }]);
await client.authorizePo(sessionId, "PO-101");

// 3. Advance time to arrival day
await client.advanceTime(sessionId, 480 * 3);

// 4. Grade final business state
const { report } = await client.grade(sessionId);
console.log("Evaluation Outcome:", report.outcome); // "pass" | "fail"`}</pre>
          </div>
        </section>
      </main>
    </div>
  );
}
