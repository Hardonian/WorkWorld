import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";
import { ActionSequenceVisualizer } from "../../components/analytics/ActionSequenceVisualizer.tsx";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Evidence status · WorkWorld" };

const gates = [
  ["Episode fixtures", "6 / 6", "Competent scripted control passes"],
  ["Negative controls", "6 / 6", "Expected failure detected"],
  ["Browser journeys", "8", "Original A1–C2 workflows plus recovery cases"],
  ["Human studies", "0", "Governance and recruitment still pending"],
];

export default function EvidenceDashboard() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3"><Link href="/" className="text-sm font-bold text-indigo-600 dark:text-indigo-400">WorkWorld</Link><span className="text-slate-300">/</span><h1 className="text-sm font-semibold">Evidence dashboard</h1></div>
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <section className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Readiness, with denominators</p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight">What the build proves—and what it does not</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">These are repository validation facts, not cohort analytics. There are no participants, customers, pilots, revenue, or comparative model results in the current evidence set.</p>
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gates.map(([label, value, detail]) => (
            <article key={label} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
              <p className="mt-2 text-3xl font-extrabold">{value}</p>
              <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{detail}</p>
            </article>
          ))}
        </section>
        <section>
          <ActionSequenceVisualizer />
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {[
            ["Technical candidate", "Verified locally", "Domain, grading, persistence, UI journeys, and RLS policy tests have executable coverage."],
            ["Research readiness", "Protocol stage", "Study materials exist; practitioner validation and governed participant work remain external gates."],
            ["Commercial readiness", "Unvalidated", "No buyer interviews, contracts, pilots, pricing evidence, or operating history are claimed."],
          ].map(([title, status, body]) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-bold">{title}</h3><p className="mt-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">{status}</p><p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{body}</p></article>
          ))}
        </section>
      </main>
    </div>
  );
}
