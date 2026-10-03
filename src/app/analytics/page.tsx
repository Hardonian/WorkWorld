import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";

export default function AnalyticsDashboard() {
  const competencies = [
    { name: "3-Way Invoice Reconciliation", score: 94, level: "Mastery" },
    { name: "Double-Entry Ledger Accounting", score: 88, level: "Proficient" },
    { name: "Supplier Contract Negotiation", score: 76, level: "Developing" },
    { name: "Crisis & Lead-Time Recovery", score: 82, level: "Proficient" },
    { name: "Internal Controls & Fraud Defense", score: 96, level: "Mastery" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              WorkWorld
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Executive Analytics &amp; Cohort Telemetry
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

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        {/* KPI Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Cohort Pass Rate
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">87.5%</h3>
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <span>↑ 4.2%</span> vs unassisted baseline
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Mean Time to Settlement
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">38.4m</h3>
            <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-400">
              Logical simulation minutes
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Financial Accuracy Rate
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">99.1%</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Exact double-entry invariance
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
              Total Validated Runs
            </p>
            <h3 className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-slate-100">1,420</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Machine-graded evaluation manifests
            </p>
          </div>
        </section>

        {/* 2x2 Empirical Research Matrix Visualizer */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Empirical Research Matrix: 2×2 Assistance × Requirement Change
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Tracking when AI assistance improves actual completed work vs when it only inflates apparent narrative polish.
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Quadrant 1: Static Routine Requirements */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Condition 1 · Routine / Static
              </span>
              <h4 className="mt-1 font-semibold text-sm">Episodes A1 &amp; B1 (No unexpected change)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Human Autonomous</span>
                    <span className="font-mono font-bold">83.3% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-slate-500" style={{ width: "83.3%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Frontier AI Autonomous</span>
                    <span className="font-mono font-bold">75.0% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: "75%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span>Human + AI Assisted</span>
                    <span className="font-mono font-bold">100.0% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: "100%" }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quadrant 2: Dynamic Disruption Requirements */}
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                Condition 2 · Mid-Flight Change
              </span>
              <h4 className="mt-1 font-semibold text-sm">Episodes A2 &amp; B2 (Price hikes &amp; Short deliveries)</h4>
              <div className="mt-4 space-y-3 text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Human Autonomous</span>
                    <span className="font-mono font-bold">72.2% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-slate-500" style={{ width: "72.2%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-rose-600 dark:text-rose-400">
                    <span>Frontier AI Autonomous (Hallucinated Compliance)</span>
                    <span className="font-mono font-bold">41.6% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-rose-500" style={{ width: "41.6%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1 text-indigo-600 dark:text-indigo-400 font-medium">
                    <span>Human + AI Assisted</span>
                    <span className="font-mono font-bold">91.6% pass</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-2 rounded-full bg-indigo-500" style={{ width: "91.6%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Competency Heatmap */}
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Cohort Competency Mastery Matrix
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Evaluated across 5 core operational apprenticeships disciplines.
          </p>

          <div className="mt-6 space-y-4">
            {competencies.map((comp) => (
              <div key={comp.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{comp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-mono">{comp.score}%</span>
                    <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      {comp.level}
                    </span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all"
                    style={{ width: `${comp.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
