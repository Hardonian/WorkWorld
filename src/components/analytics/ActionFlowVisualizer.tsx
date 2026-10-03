"use client";

import React from "react";

export interface ActionNode {
  step: number;
  actionType: string;
  count: number;
  humanSuccessRate: number;
  aiSuccessRate: number;
}

export interface ActionFlowVisualizerProps {
  nodes: ActionNode[];
}

export function ActionFlowVisualizer({ nodes }: ActionFlowVisualizerProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Action Sequence Flow &amp; Branching Trajectories
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comparative analysis of human apprentice vs frontier AI action paths across canonical DAG steps.
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
          Sankey / DAG Stream
        </span>
      </div>

      <div className="space-y-3">
        {nodes.map((node) => {
          const delta = node.humanSuccessRate - node.aiSuccessRate;
          return (
            <div
              key={`${node.step}-${node.actionType}`}
              className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800/60 dark:bg-slate-950/40"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Step {node.step}: <span className="font-mono text-indigo-600 dark:text-indigo-400">{node.actionType}</span>
                </span>
                <span className="text-slate-500">{node.count} executions</span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>Human Success</span>
                    <span className="font-semibold">{node.humanSuccessRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${node.humanSuccessRate}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>AI Agent Success</span>
                    <span className="font-semibold">{node.aiSuccessRate}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${node.aiSuccessRate}%` }} />
                  </div>
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-500">
                {delta > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Human edge +{delta}% (superior qualitative review)
                  </span>
                ) : (
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    AI parity / edge {delta}% (speed advantage)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
