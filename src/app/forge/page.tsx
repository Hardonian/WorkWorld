"use client";

import { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";
import { ScenarioForge, type ScenarioForgePrompt } from "../../scenarios/forge.ts";
import type { ScenarioDefinition } from "../../scenarios/schema.ts";

export default function ScenarioForgePage() {
  const [companyName, setCompanyName] = useState("Summit Care Medical (Synthetic)");
  const [role, setRole] = useState("Operations Coordinator");
  const [crisisType, setCrisisType] = useState<ScenarioForgePrompt["crisisType"]>("supply_shortage");
  const [itemCategory, setItemCategory] = useState<ScenarioForgePrompt["itemCategory"]>("medical");
  const [budgetLimitCad, setBudgetLimitCad] = useState(2500);
  const [customInstructions, setCustomInstructions] = useState(
    "Primary distributor stockout reported at 08:30. Ensure clinic surgical schedule is not disrupted."
  );

  const [forgedScenario, setForgedScenario] = useState<ScenarioDefinition | null>(() => {
    return ScenarioForge.compile({
      crisisType: "supply_shortage",
      companyName: "Summit Care Medical (Synthetic)",
      role: "Operations Coordinator",
      itemCategory: "medical",
      targetBudgetCad: 2500,
      customInstructions: "Primary distributor stockout reported at 08:30. Ensure clinic surgical schedule is not disrupted.",
    });
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    try {
      const scenario = ScenarioForge.compile({
        crisisType,
        companyName,
        role,
        itemCategory,
        targetBudgetCad: budgetLimitCad,
        customInstructions,
      });
      setForgedScenario(scenario);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyJson = () => {
    if (!forgedScenario) return;
    navigator.clipboard.writeText(JSON.stringify(forgedScenario, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
              WorkWorld
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <h1 className="text-sm font-semibold">Instant Scenario Forge</h1>
            <span className="rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Generative Sim Engine
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/arena"
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              Model Arena
            </Link>
            <Link
              href="/workspace"
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              Go to Workspace
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Pillar 3 & Enterprise Moat
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Generative Simulation Compiler
          </h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Generate customized, deterministically verifiable operations scenarios with complete double-entry ledgers,
            vendor catalogs, scheduled crises, and automated evaluation rubrics in seconds.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Controls Form */}
          <div className="space-y-6 lg:col-span-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Scenario Configuration
              </h3>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Enterprise / Company
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Candidate Role / Persona
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Crisis Archetype
                  </label>
                  <select
                    value={crisisType}
                    onChange={(e) => setCrisisType(e.target.value as ScenarioForgePrompt["crisisType"])}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="supply_shortage">Supply Shortage & Stockout</option>
                    <option value="cash_crunch">Cash Crunch & Liquidity Optimization</option>
                    <option value="fraud_attempt">Fraud Attempt & Banking Change Defense</option>
                    <option value="logistics_delay">Logistics Delay & Expedited Freight</option>
                    <option value="quality_defect">Defective Delivery & RMA Process</option>
                    <option value="routine">Routine Operational Replenishment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Item & Supply Catalog Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value as ScenarioForgePrompt["itemCategory"])}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  >
                    <option value="medical">Medical & Clinical Supplies</option>
                    <option value="industrial">Industrial & Mechanical Equipment</option>
                    <option value="electronics">Electronics & Semiconductors</option>
                    <option value="hospitality">Hospitality & Facilities</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <span>Operating Budget Cap</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400">
                      CAD ${budgetLimitCad.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="500"
                    value={budgetLimitCad}
                    onChange={(e) => setBudgetLimitCad(Number(e.target.value))}
                    className="mt-2 w-full accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Custom Scenario Instructions / Context
                  </label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-500 transition-colors disabled:opacity-50"
                >
                  {isGenerating ? "Compiling..." : "⚡ Forge Scenario"}
                </button>
              </div>
            </div>
          </div>

          {/* Compiled Scenario Preview */}
          <div className="space-y-6 lg:col-span-7">
            {forgedScenario ? (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400">
                      ID: {forgedScenario.id} · Family: {forgedScenario.family}
                    </span>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {forgedScenario.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="rounded border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    >
                      {copied ? "✓ Copied!" : "Copy JSON"}
                    </button>
                    <Link
                      href="/workspace"
                      className="rounded bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500"
                    >
                      Run in Sandbox
                    </Link>
                  </div>
                </div>

                {/* Brief Section */}
                <div className="mt-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Company & Role</h4>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {forgedScenario.brief.company} — <span className="font-normal">{forgedScenario.brief.role}</span>
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Situation</h4>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {forgedScenario.brief.situation}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Key Objectives</h4>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {forgedScenario.brief.objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Verifiable Predicates ({forgedScenario.requirementPredicates.length})
                    </h4>
                    <div className="mt-1 space-y-1.5">
                      {forgedScenario.requirementPredicates.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-800 dark:bg-slate-950"
                        >
                          <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{p.id}</span>
                          <span className="text-slate-600 dark:text-slate-300">{p.description}</span>
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {p.kind}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Public Checklist ({forgedScenario.publicChecklist.length})
                    </h4>
                    <ul className="mt-1 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      {forgedScenario.publicChecklist.map((item, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="text-indigo-500">✓</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
