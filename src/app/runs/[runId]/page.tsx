import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicRun } from "../../../index/registry.ts";

export const metadata: Metadata = { title: "Run evidence · WorkWorld Index" };

export default async function RunEvidencePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const run = getPublicRun(runId);
  if (!run) notFound();

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/leaderboard" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">← Public Index</Link>
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-9">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">{run.status} evidence package</p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight">{run.label}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{run.kind} · {run.suite} · captured {run.createdAt}</p>
            </div>
            <a href={`/api/index/runs/${run.id}`} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-950">Download evidence JSON</a>
          </div>
          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">{run.notes}</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs text-slate-500">Outcome</p><p className="mt-1 font-mono text-lg font-bold">{run.completed}</p></div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs text-slate-500">Policy / detection</p><p className="mt-1 font-mono text-lg font-bold">{run.policy}</p></div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950"><p className="text-xs text-slate-500">Reproducibility</p><p className="mt-1 font-mono text-lg font-bold">{run.reproducibility}</p></div>
          </div>
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-950"><tr><th className="px-4 py-3">Episode</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">State digest</th></tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">{run.runs.map((item) => <tr key={item.episode}><td className="px-4 py-3 font-semibold">{item.episode}</td><td className="px-4 py-3 text-emerald-700 dark:text-emerald-400">{item.score}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{item.digest}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3 text-sm"><span className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">Manifest: {run.manifest}</span><span className="rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs text-slate-600 dark:border-slate-700 dark:text-slate-400">Report: {run.report}</span></div>
        </section>
      </div>
    </main>
  );
}
