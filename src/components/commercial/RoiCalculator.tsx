"use client";

import { useState } from "react";

export function RoiCalculator() {
  const [annualInvoices, setAnnualInvoices] = useState(5000);
  const [teamSize, setTeamSize] = useState(4);
  const [errorRatePct, setErrorRatePct] = useState(1.8);
  const [avgInvoiceValue, setAvgInvoiceValue] = useState(1200);

  // Financial calculations
  // Typical AP error rate involves duplicate invoices, quantity variances, uncollected short-pay credits
  const totalSpend = annualInvoices * avgInvoiceValue;
  const potentialLeakage = totalSpend * (errorRatePct / 100);
  // WorkWorld trained operators / verified AI agents prevent ~85% of caught discrepancies
  const annualSavingsLeakage = potentialLeakage * 0.85;

  // Labor efficiency savings (approx 12 mins per disputed invoice avoided)
  const disputesAvoided = Math.round(annualInvoices * (errorRatePct / 100) * 0.85);
  const hoursSaved = Math.round((disputesAvoided * 12) / 60);
  const laborSavings = hoursSaved * 45; // $45/hr fully loaded operational cost

  const totalAnnualBenefit = annualSavingsLeakage + laborSavings;
  const subscriptionCost = teamSize * 199 * 12; // Enterprise tier $199/seat/mo
  const netRoi = totalAnnualBenefit - subscriptionCost;
  const roiMultiple = subscriptionCost > 0 ? (totalAnnualBenefit / subscriptionCost).toFixed(1) : "0";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
        <span className="rounded bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Executive ROI Calculator
        </span>
        <h3 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
          Financial & Operational Impact Model
        </h3>
        <p className="mt-1 text-xs text-slate-500">
          Quantify direct cash recovery from automated 3-way matching and verified human/AI apprenticeship training.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Controls */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Annual Invoices Processed</span>
              <span className="text-indigo-600 dark:text-indigo-400">{annualInvoices.toLocaleString()} invoices</span>
            </div>
            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={annualInvoices}
              onChange={(e) => setAnnualInvoices(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Average Invoice Value</span>
              <span className="text-indigo-600 dark:text-indigo-400">${avgInvoiceValue.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={200}
              max={10000}
              step={100}
              value={avgInvoiceValue}
              onChange={(e) => setAvgInvoiceValue(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Baseline Discrepancy / Overbilling Rate</span>
              <span className="text-indigo-600 dark:text-indigo-400">{errorRatePct.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={errorRatePct}
              onChange={(e) => setErrorRatePct(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span>Operations / AP Team Size</span>
              <span className="text-indigo-600 dark:text-indigo-400">{teamSize} seats</span>
            </div>
            <input
              type="range"
              min={1}
              max={50}
              step={1}
              value={teamSize}
              onChange={(e) => setTeamSize(Number(e.target.value))}
              className="mt-1.5 w-full accent-indigo-600"
            />
          </div>
        </div>

        {/* Projected Impact Card */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            Projected Annual Value Recovery
          </span>
          <div className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            ${Math.round(totalAnnualBenefit).toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Net ROI: <span className="font-semibold text-emerald-600 dark:text-emerald-400">${Math.round(netRoi).toLocaleString()}/yr</span> ({roiMultiple}x return on investment)
          </p>

          <div className="mt-4 divide-y divide-indigo-100/60 text-xs dark:divide-indigo-900/40">
            <div className="flex justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Direct Overbilling Leakage Prevented</span>
              <span className="font-bold text-slate-900 dark:text-white">${Math.round(annualSavingsLeakage).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">Manual Dispute Hours Reclaimed</span>
              <span className="font-bold text-slate-900 dark:text-white">{hoursSaved} hrs (${Math.round(laborSavings).toLocaleString()})</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600 dark:text-slate-400">WorkWorld Enterprise Platform Cost</span>
              <span className="font-bold text-slate-500">${subscriptionCost.toLocaleString()}/yr</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
