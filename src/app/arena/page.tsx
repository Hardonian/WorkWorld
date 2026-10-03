"use client";

import React, { useState } from "react";
import { BenchmarkArena, type ModelProfile, type ArenaMatch } from "../../agents/benchmark-arena.ts";
import Link from "next/link";

const initialArena = new BenchmarkArena();

export default function ArenaPage() {
  const [arena] = useState(initialArena);
  const [leaderboard, setLeaderboard] = useState<ModelProfile[]>(() => arena.getLeaderboard());
  const [matches, setMatches] = useState<ArenaMatch[]>(() => arena.getRecentMatches());
  const [selectedA, setSelectedA] = useState<string>("claude-3-7-sonnet");
  const [selectedB, setSelectedB] = useState<string>("gpt-4o");
  const [matchRunning, setMatchRunning] = useState<boolean>(false);

  const runHeadToHead = () => {
    if (selectedA === selectedB) return;
    setMatchRunning(true);

    setTimeout(() => {
      // Simulate score with slight variance based on existing pass rates
      const modelA = arena.getModel(selectedA);
      const modelB = arena.getModel(selectedB);
      if (!modelA || !modelB) return;

      const scoreA = Math.round(modelA.passRatePct + (Math.random() * 10 - 5));
      const scoreB = Math.round(modelB.passRatePct + (Math.random() * 10 - 5));

      arena.recordMatch("A1", selectedA, selectedB, scoreA, scoreB);
      setLeaderboard(arena.getLeaderboard());
      setMatches(arena.getRecentMatches());
      setMatchRunning(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3">
              <span>🏆 Frontier Model Arena</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">WorkWorld Bench & Arena</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Public comparative benchmark ranking frontier AI models on commercial operations, accounting invariants, and policy compliance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition"
            >
              Workspace
            </Link>
            <Link
              href="/leaderboard"
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
            >
              View Full Benchmark
            </Link>
          </div>
        </div>

        {/* Head-to-Head Arena Battle Simulator */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-indigo-200/80 dark:border-indigo-900/50 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>⚔️ Live Pairwise Arena Match</span>
            </h2>
            <span className="text-xs text-slate-500 font-mono">Elo System (K=32)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Model A Selector */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Model A</label>
              <select
                value={selectedA}
                onChange={(e) => setSelectedA(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
              >
                {leaderboard.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.displayName} (Elo: {m.eloRating})
                  </option>
                ))}
              </select>
            </div>

            {/* VS Action */}
            <div className="text-center space-y-2">
              <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">VS</div>
              <button
                type="button"
                onClick={runHeadToHead}
                disabled={matchRunning || selectedA === selectedB}
                className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold text-sm transition shadow-md disabled:opacity-50"
              >
                {matchRunning ? "Simulating Episode..." : "Simulate Arena Battle"}
              </button>
            </div>

            {/* Model B Selector */}
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Model B</label>
              <select
                value={selectedB}
                onChange={(e) => setSelectedB(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm font-medium"
              >
                {leaderboard.map((m) => (
                  <option key={m.modelId} value={m.modelId}>
                    {m.displayName} (Elo: {m.eloRating})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Global Elo Leaderboard Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Global Operational Elo Standings</h2>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/50 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800 text-xs">
                <tr>
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Elo Rating</th>
                  <th className="py-3 px-4">State Pass Rate</th>
                  <th className="py-3 px-4">Policy Adherence</th>
                  <th className="py-3 px-4">Cost / Correct Run</th>
                  <th className="py-3 px-4">Efficiency Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {leaderboard.map((model, idx) => (
                  <tr key={model.modelId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                      {idx === 0 ? "🥇 1" : idx === 1 ? "🥈 2" : idx === 2 ? "🥉 3" : `  ${idx + 1}`}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {model.displayName}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {model.eloRating}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {model.passRatePct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {model.policyAdherencePct.toFixed(1)}%
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      ${model.costPerCorrectSettlementUsd.toFixed(3)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-indigo-600 dark:text-indigo-400">
                      {model.actionEfficiencyPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Matches Log */}
        {matches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Recent Arena Matches</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <div
                  key={match.matchId}
                  className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-sm shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {match.modelA} ({match.scoreA}) vs {match.modelB} ({match.scoreB})
                    </div>
                    <div className="text-xs text-slate-500">
                      Scenario: {match.scenarioId} &middot; Winner: <span className="font-medium text-indigo-600 dark:text-indigo-400">{match.winner}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(match.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
