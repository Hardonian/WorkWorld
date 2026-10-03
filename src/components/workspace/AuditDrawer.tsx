"use client";

import React, { useState } from "react";
import type { Observation } from "../../domain/observation.ts";

interface AuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  observation: Observation | null;
}

export function AuditDrawer({ isOpen, onClose, observation }: AuditDrawerProps) {
  const [filter, setFilter] = useState<"all" | "errors" | "actions">("all");

  if (!isOpen || !observation) return null;

  const actions = observation.recentActions ?? [];
  const filteredActions = actions.filter((a) => {
    if (filter === "errors") return a.errors && a.errors.length > 0;
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/40 backdrop-blur-xs animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl h-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50/50 dark:bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Audit Timeline &amp; State Trace
              </h2>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                r{observation.revision}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Run ID: <span className="font-mono">{observation.runId}</span> · Scenario:{" "}
              <strong>{observation.scenarioId}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close audit drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filter controls */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-2 text-xs bg-slate-50 dark:bg-slate-950">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                filter === "all"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              All Actions ({actions.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("errors")}
              className={`rounded px-2 py-1 font-medium transition-colors ${
                filter === "errors"
                  ? "bg-rose-600 text-white"
                  : "text-slate-600 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
              }`}
            >
              Policy Rejections ({actions.filter((a) => a.errors.length > 0).length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              const blob = new Blob([JSON.stringify(observation, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `workworld-audit-${observation.scenarioId}-r${observation.revision}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export JSON
          </button>
        </div>

        {/* Timeline Log */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {filteredActions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-400">
              No actions recorded in this view yet.
            </div>
          ) : (
            filteredActions.map((h, i: number) => {
              const isOk = h.outcome === "ok";
              return (
                <div
                  key={i}
                  className="relative flex gap-3 border-l-2 border-indigo-200 dark:border-indigo-900 pl-4 pb-2"
                >
                  <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-indigo-500 ring-4 ring-white dark:ring-slate-900" />
                  <div className="flex-1 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60 shadow-xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {h.type.replace(/_/g, " ").toUpperCase()}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Minute {h.atMinute}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                          isOk
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                            : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                        }`}
                      >
                        {isOk ? "Success" : "Rejected"}
                      </span>
                    </div>
                    {h.errors && h.errors.length > 0 ? (
                      <div className="mt-2 rounded bg-rose-50 p-2 text-xs text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                        <p className="font-semibold">Policy Failure:</p>
                        <ul className="list-disc list-inside mt-0.5">
                          {h.errors.map((err, errIdx: number) => (
                            <li key={errIdx}>
                              <strong>{err.code}</strong>: {err.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
