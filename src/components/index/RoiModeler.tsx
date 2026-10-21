"use client";

import { useMemo, useState } from "react";
import { modelWorkflowRoi, type RoiModelInput } from "../../index/roi.ts";

const defaults: RoiModelInput = {
  monthlyWorkflowVolume: 500,
  minutesPerWorkflow: 18,
  loadedHourlyRateUsd: 48,
  agentCompletionRatePct: 75,
  humanInterventionRatePct: 20,
  minutesPerIntervention: 7,
  agentCostPerRunUsd: 0.18,
  preventableFailureRatePct: 1.5,
  costPerPreventedFailureUsd: 280,
  platformMonthlyCostUsd: 1500,
};

const fields: Array<{ key: keyof RoiModelInput; label: string; step: string }> = [
  { key: "monthlyWorkflowVolume", label: "Monthly workflow volume", step: "1" },
  { key: "minutesPerWorkflow", label: "Human minutes per workflow", step: "1" },
  { key: "loadedHourlyRateUsd", label: "Loaded hourly rate (USD)", step: "1" },
  { key: "agentCompletionRatePct", label: "Agent completion rate (%)", step: "1" },
  { key: "humanInterventionRatePct", label: "Human intervention rate (%)", step: "1" },
  { key: "minutesPerIntervention", label: "Minutes per intervention", step: "1" },
  { key: "agentCostPerRunUsd", label: "Agent cost per run (USD)", step: "0.01" },
  { key: "preventableFailureRatePct", label: "Preventable failure rate (%)", step: "0.1" },
  { key: "costPerPreventedFailureUsd", label: "Cost per prevented failure (USD)", step: "1" },
  { key: "platformMonthlyCostUsd", label: "Platform monthly cost (USD)", step: "1" },
];

const usd = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

export function RoiModeler() {
  const [input, setInput] = useState(defaults);
  const result = useMemo(() => modelWorkflowRoi(input), [input]);
  return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"><div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Planning model</p><h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">Measure ROI from the work—not a generic token dashboard.</h1><p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">Model labor baseline, observed completion, intervention burden, agent spend, and avoided failure. Replace assumptions with a pilot&apos;s measured values before using this in a buying decision.</p></div><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_.8fr]"><div className="grid gap-4 sm:grid-cols-2">{fields.map(({ key, label, step }) => <label key={key} className="text-sm font-semibold">{label}<input aria-label={label} type="number" min="0" step={step} value={input[key]} onChange={(event) => setInput((current) => ({ ...current, [key]: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950 dark:focus:ring-indigo-950" /></label>)}</div><aside className="rounded-2xl bg-slate-950 p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-300">Modeled net benefit</p><p className="mt-2 text-4xl font-black">{usd(result.modeledMonthlyNetBenefitUsd)}<span className="text-base font-semibold text-slate-400"> / month</span></p><p className="mt-2 text-sm text-slate-300">Annual modeled net benefit: <strong>{usd(result.modeledAnnualNetBenefitUsd)}</strong></p><dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between gap-4"><dt className="text-slate-400">Labor baseline</dt><dd>{usd(result.modeledMonthlyLaborBaselineUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Agent + oversight</dt><dd>{usd(result.modeledMonthlyAgentCostUsd + result.modeledMonthlyHumanOversightUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Avoided failure value</dt><dd>{usd(result.modeledMonthlyAvoidedFailureUsd)}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Modeled ROI</dt><dd>{result.modeledRoiPct === null ? "N/A" : `${result.modeledRoiPct}%`}</dd></div><div className="flex justify-between gap-4"><dt className="text-slate-400">Break-even completed workflows</dt><dd>{result.breakEvenCompletedWorkflows ?? "Not reached"}</dd></div></dl><p className="mt-6 text-xs leading-relaxed text-slate-400">{result.claimLimits}</p></aside></div></section>;
}
