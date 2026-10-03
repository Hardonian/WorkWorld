import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Evaluation status · WorkWorld" };

const verifiedRows = [
  {
    actor: "Competent scripted fixture",
    scope: "A1–C2 · 6 episodes",
    result: "6 / 6 pass",
    evidence: "Deterministic harness control",
  },
  {
    actor: "Adversarial negative controls",
    scope: "N1–N6 · 6 controls",
    result: "6 / 6 fail as expected",
    evidence: "Failure-specific control suite",
  },
  {
    actor: "Local Ollama adapter smoke",
    scope: "A1 · connectivity only",
    result: "Not scored",
    evidence: "Adapter/timeout behavior, not capability",
  },
];

export default function ValidationStatusPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold text-indigo-600 dark:text-indigo-400">WorkWorld</Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm font-semibold">Evaluation status</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-10">
        <section className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Verified evidence only</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">Harness validation, not a model leaderboard</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            No paid-provider comparison or human study has run yet. This page deliberately shows only evidence produced by the repository’s deterministic controls. Model rankings, general capability, employability, and accreditation are not claimed.
          </p>
        </section>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              <tr><th className="px-4 py-3">Evidence source</th><th className="px-4 py-3">Scope</th><th className="px-4 py-3">Observed result</th><th className="px-4 py-3">Claim limit</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {verifiedRows.map((row) => (
                <tr key={row.actor}>
                  <td className="px-4 py-3 font-semibold">{row.actor}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.scope}</td>
                  <td className="px-4 py-3 font-mono text-indigo-700 dark:text-indigo-300">{row.result}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{row.evidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <h3 className="font-bold">Next evidence gate</h3>
          <p className="mt-1">Run pre-registered live-model trials with an explicit spend cap, then conduct practitioner review and governed human feasibility work. Until then, fixture results remain separated from model and participant results.</p>
        </section>
      </main>
    </div>
  );
}
