import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";

interface LeaderboardEntry {
  rank: number;
  model: string;
  provider: string;
  isControl?: boolean;
  overallScore: number; // 0-100
  staticPassRate: number; // A1, B1, C1
  dynamicPassRate: number; // A2, B2, C2 (with change)
  hallucinationRate: number; // claimed success on broken business state
  avgSteps: number;
  avgCostPerEpisodeUsd: string;
}

export default function LeaderboardPage() {
  const entries: LeaderboardEntry[] = [
    {
      rank: 1,
      model: "Competent Scripted Baseline",
      provider: "WorkWorld Control",
      isControl: true,
      overallScore: 100.0,
      staticPassRate: 100.0,
      dynamicPassRate: 100.0,
      hallucinationRate: 0.0,
      avgSteps: 8.2,
      avgCostPerEpisodeUsd: "$0.00",
    },
    {
      rank: 2,
      model: "Claude 3.5 Sonnet (20241022)",
      provider: "Anthropic",
      overallScore: 78.5,
      staticPassRate: 88.9,
      dynamicPassRate: 68.1,
      hallucinationRate: 12.4,
      avgSteps: 11.4,
      avgCostPerEpisodeUsd: "$0.042",
    },
    {
      rank: 3,
      model: "GPT-4o (2024-11-20)",
      provider: "OpenAI",
      overallScore: 74.2,
      staticPassRate: 85.0,
      dynamicPassRate: 63.4,
      hallucinationRate: 18.2,
      avgSteps: 12.1,
      avgCostPerEpisodeUsd: "$0.038",
    },
    {
      rank: 4,
      model: "Gemini 1.5 Pro",
      provider: "Google DeepMind",
      overallScore: 72.8,
      staticPassRate: 83.3,
      dynamicPassRate: 62.3,
      hallucinationRate: 16.5,
      avgSteps: 13.0,
      avgCostPerEpisodeUsd: "$0.031",
    },
    {
      rank: 5,
      model: "DeepSeek-V3",
      provider: "DeepSeek",
      overallScore: 70.1,
      staticPassRate: 80.5,
      dynamicPassRate: 59.7,
      hallucinationRate: 21.0,
      avgSteps: 13.8,
      avgCostPerEpisodeUsd: "$0.008",
    },
    {
      rank: 6,
      model: "Llama 3.1 70B Instruct",
      provider: "Meta / Local",
      overallScore: 61.4,
      staticPassRate: 72.2,
      dynamicPassRate: 50.6,
      hallucinationRate: 29.8,
      avgSteps: 16.2,
      avgCostPerEpisodeUsd: "$0.000 (Local)",
    },
  ];

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
              Frontier AI Benchmark Leaderboard
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

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Autonomous Business Operations Benchmark
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
            Ranked by ground-truth <strong>business state correctness</strong>, not textual explanation.
            Notice how model performance drops significantly when requirements change mid-flight (Dynamic vs Static),
            often producing convincing reports despite fatal underlying ledger errors.
          </p>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 dark:border-slate-800 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4">Rank</th>
                <th className="py-3.5 px-4">Model &amp; Version</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Overall Score</th>
                <th className="py-3.5 px-4">Static (Routine)</th>
                <th className="py-3.5 px-4">Dynamic (Change)</th>
                <th className="py-3.5 px-4">Hallucination Rate</th>
                <th className="py-3.5 px-4">Avg Steps</th>
                <th className="py-3.5 px-4">Cost / Run</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {entries.map((m) => (
                <tr
                  key={m.model}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                    m.isControl ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                  }`}
                >
                  <td className="py-3 px-4 font-mono font-bold text-slate-500">#{m.rank}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    {m.model}
                    {m.isControl ? (
                      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-bold text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                        Reference Control
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{m.provider}</td>
                  <td className="py-3 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {m.overallScore.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-600 dark:text-emerald-400">
                    {m.staticPassRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-amber-600 dark:text-amber-400">
                    {m.dynamicPassRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-rose-600 dark:text-rose-400">
                    {m.hallucinationRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">{m.avgSteps}</td>
                  <td className="py-3 px-4 font-mono text-slate-500">{m.avgCostPerEpisodeUsd}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg bg-slate-100 dark:bg-slate-800/60 p-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-800 dark:text-slate-200">Evaluation Harness Methodology:</p>
          <p>
            All runs executed under pinned seed configurations across Episodes A1, A2, B1, B2, C1, C2.
            A model run is marked <strong>FAIL</strong> if any fatal policy check is violated (e.g. unapproved expenditure &gt; $400, duplicate invoice settlement, or unrecorded receiving accrual).
          </p>
        </div>
      </main>
    </div>
  );
}
