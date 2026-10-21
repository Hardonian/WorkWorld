"use client";

import { useState } from "react";

const defaultManifest = {
  agent: "",
  endpointType: "OpenAI-compatible",
  budget: "25",
  contact: "",
};

export function CertificationConfigurator() {
  const [manifest, setManifest] = useState(defaultManifest);
  const [prepared, setPrepared] = useState(false);

  const update = (field: keyof typeof defaultManifest, value: string) =>
    setManifest((current) => ({ ...current, [field]: value }));

  const download = () => {
    const content = JSON.stringify(
      {
        manifestVersion: 1,
        program: "WorkWorld Index private certification",
        agent: { displayName: manifest.agent || "Unnamed agent", endpointType: manifest.endpointType },
        evaluation: { suites: ["purchasing", "reconciliation", "customer-recovery"], maxBudgetUsd: Number(manifest.budget || 0) },
        contact: manifest.contact || undefined,
        privacy: "This preflight file contains no credentials or prompts.",
      },
      null,
      2,
    );
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "workworld-index-preflight.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-950/5 dark:border-slate-800 dark:bg-slate-900 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Private preflight</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Bring your agent</h2>
        </div>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Credentials stay with you</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Agent name
          <input value={manifest.agent} onChange={(event) => update("agent", event.target.value)} placeholder="e.g. FinanceOps v0.4" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" />
        </label>
        <label className="text-sm font-semibold">Adapter
          <select value={manifest.endpointType} onChange={(event) => update("endpointType", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950">
            <option>OpenAI-compatible</option>
            <option>Anthropic Messages</option>
            <option>Local Ollama</option>
            <option>Custom MCP agent</option>
          </select>
        </label>
        <label className="text-sm font-semibold">Maximum evaluation budget (USD)
          <input value={manifest.budget} inputMode="decimal" onChange={(event) => update("budget", event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" />
        </label>
        <label className="text-sm font-semibold">Technical contact <span className="font-normal text-slate-400">(optional)</span>
          <input value={manifest.contact} type="email" onChange={(event) => update("contact", event.target.value)} placeholder="you@company.com" className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" />
        </label>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={() => setPrepared(true)} className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700">Prepare private run</button>
        <button type="button" onClick={download} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Download preflight JSON</button>
      </div>
      {prepared ? <p role="status" className="mt-4 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">Preflight prepared. Your exported manifest excludes credentials, prompts, and business data; connect it to the runner when your private environment is ready.</p> : null}
    </section>
  );
}
