import Link from "next/link";
import { listScenarios } from "../scenarios/catalog.ts";
import StartButton from "../components/home/StartButton.tsx";
import { ThemeToggle } from "../components/ui/ThemeProvider.tsx";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Episode catalog · WorkWorld",
  description: "Run synthetic professional-work simulations and inspect deterministic outcome evidence.",
};

export default function Home() {
  const scenarios = listScenarios();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-3.5">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm">
              W
            </span>
            <span className="font-bold tracking-tight text-slate-900 dark:text-slate-100 text-base">
              WorkWorld
            </span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Local research candidate
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-4 text-xs font-semibold">
            <Link href="/workspace" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Workspace
            </Link>
            <Link href="/assessor" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Assessor
            </Link>
            <Link href="/analytics" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Analytics
            </Link>
            <Link href="/leaderboard" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Leaderboard
            </Link>
            <Link href="/pricing" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Pricing
            </Link>
            <Link href="/docs" className="text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Docs &amp; API
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-6xl px-6 py-12 space-y-12">
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            Operations apprenticeship &amp; evaluation research
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 leading-tight">
            Executable professional-work simulations
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Operate a persistent, consequential operations environment — purchase orders, deliveries, invoices, ledgers, tickets, and spreadsheets. Graded on <strong>true business state correctness</strong>, not narrative report polish.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/workspace"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
            >
              Launch guided simulation
            </Link>
            <Link
              href="/docs"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Review methods &amp; API
            </Link>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
              ⚖️
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              State-Based Grading
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Deterministic outcome checks read actual ledgers and documents: authorization, 3-way matching, zero duplicate settlement, and exact financial balances.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
              🤖
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Agent-ready harness
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Run deterministic fixtures, OpenAI-compatible providers, or local Ollama through one bounded agent loop. An experimental REST and JSON-RPC interface is included for local evaluation.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-2">
            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold">
              📜
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Inspectable evidence
            </h3>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Every run retains state digests, action evidence, narrow deterministic checks, and separately attributable human judgments. The project does not issue credentials or employment claims.
            </p>
          </div>
        </section>

        {/* Episode Catalog Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Operations Apprenticeship Episodes
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Northline Supply Co. (synthetic). {scenarios.length} authored, code-reviewed episodes spanning purchasing, reconciliation, and customer recovery; practitioner validation remains pending.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {scenarios.map((s, i) => (
              <article
                key={s.id}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-indigo-400 dark:hover:border-indigo-600"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {s.id} · {s.family.replace(/_/g, " ")}
                    </span>
                    {i === 0 ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Guided Start
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{s.title}</h3>
                  <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                    {s.brief.situation}
                  </p>
                  <ul className="mt-3 space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {s.brief.objectives.slice(0, 2).map((o) => (
                      <li key={o} className="truncate">• {o}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-mono">
                    Budget: ${(s.policy.budgetMinor / 100).toLocaleString()} CAD
                  </span>
                  <StartButton
                    scenarioId={s.id}
                    label={i === 0 ? "Start guided episode" : "Start episode"}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 pt-8 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <Link href="/workspace" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Learner Workspace
            </Link>
            <Link href="/assessor" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Assessor Review
            </Link>
            <Link href="/analytics" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Analytics
            </Link>
            <Link href="/leaderboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              AI Leaderboard
            </Link>
            <Link href="/docs" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              Docs &amp; API
            </Link>
            <Link href="/health" className="hover:text-indigo-600 dark:hover:text-indigo-400">
              System Health
            </Link>
          </div>
          <div>
            <span>WorkWorld Platform · MIT Licensed · Synthetic Benchmark Data</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
