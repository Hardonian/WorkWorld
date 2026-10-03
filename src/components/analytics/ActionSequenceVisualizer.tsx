"use client";

import React, { useState } from "react";

export interface ActionNode {
  id: string;
  label: string;
  category: "input" | "procurement" | "logistics" | "finance" | "review";
  humanFrequencyPct: number;
  agentFrequencyPct: number;
  averageLatencySeconds: number;
  commonFailureReason?: string;
}

const DEFAULT_NODES: ActionNode[] = [
  {
    id: "step_0",
    label: "Read Ticket & Brief",
    category: "input",
    humanFrequencyPct: 98,
    agentFrequencyPct: 100,
    averageLatencySeconds: 42,
  },
  {
    id: "step_1",
    label: "Catalog Price Check",
    category: "procurement",
    humanFrequencyPct: 88,
    agentFrequencyPct: 95,
    averageLatencySeconds: 28,
  },
  {
    id: "step_2",
    label: "Create Purchase Order",
    category: "procurement",
    humanFrequencyPct: 94,
    agentFrequencyPct: 92,
    averageLatencySeconds: 65,
    commonFailureReason: "Ordering unauthorized substitute item",
  },
  {
    id: "step_3",
    label: "Delivery Check-In",
    category: "logistics",
    humanFrequencyPct: 82,
    agentFrequencyPct: 85,
    averageLatencySeconds: 31,
  },
  {
    id: "step_4",
    label: "3-Way Invoice Match",
    category: "finance",
    humanFrequencyPct: 76,
    agentFrequencyPct: 81,
    averageLatencySeconds: 110,
    commonFailureReason: "Overlooking quantity shortfall on line 2",
  },
  {
    id: "step_5",
    label: "Settlement & Posting",
    category: "finance",
    humanFrequencyPct: 71,
    agentFrequencyPct: 78,
    averageLatencySeconds: 54,
    commonFailureReason: "Premature settlement before delivery check-in",
  },
  {
    id: "step_6",
    label: "Final Work Submission",
    category: "review",
    humanFrequencyPct: 92,
    agentFrequencyPct: 98,
    averageLatencySeconds: 75,
  },
];

const CATEGORY_COLORS: Record<ActionNode["category"], { bg: string; border: string; text: string }> = {
  input: { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-400 dark:border-blue-700", text: "text-blue-700 dark:text-blue-300" },
  procurement: { bg: "bg-emerald-50 dark:bg-emerald-950/40", border: "border-emerald-400 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-300" },
  logistics: { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-400 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300" },
  finance: { bg: "bg-indigo-50 dark:bg-indigo-950/40", border: "border-indigo-400 dark:border-indigo-700", text: "text-indigo-700 dark:text-indigo-300" },
  review: { bg: "bg-purple-50 dark:bg-purple-950/40", border: "border-purple-400 dark:border-purple-700", text: "text-purple-700 dark:text-purple-300" },
};

export function ActionSequenceVisualizer({ nodes = DEFAULT_NODES }: { nodes?: ActionNode[] }) {
  const [selectedNode, setSelectedNode] = useState<ActionNode | null>(nodes[2] || null);
  const [compareMode, setCompareMode] = useState<"all" | "human" | "agent">("all");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Action Sequence & Decision Branching Graph (Item 075)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Empirical step-by-step traversal flow comparing Human Apprentices vs Autonomous AI Agents.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 p-1 text-xs dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setCompareMode("all")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              compareMode === "all" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            All Trajectories
          </button>
          <button
            type="button"
            onClick={() => setCompareMode("human")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              compareMode === "human" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            Human Only
          </button>
          <button
            type="button"
            onClick={() => setCompareMode("agent")}
            className={`rounded px-2.5 py-1 font-medium transition-colors ${
              compareMode === "agent" ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            AI Agent Only
          </button>
        </div>
      </div>

      {/* Horizontal Flow Diagram */}
      <div className="relative mt-6 overflow-x-auto pb-4">
        <div className="flex min-w-[760px] items-center justify-between gap-2">
          {nodes.map((node, i) => {
            const colors = CATEGORY_COLORS[node.category];
            const isSelected = selectedNode?.id === node.id;
            return (
              <React.Fragment key={node.id}>
                <button
                  type="button"
                  onClick={() => setSelectedNode(node)}
                  className={`flex-1 min-w-[120px] rounded-lg border p-3 text-left transition-all ${
                    colors.bg
                  } ${
                    isSelected ? "ring-2 ring-indigo-500 shadow-md scale-105" : colors.border
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                      Step 0{i + 1}
                    </span>
                    <span className={`text-[10px] font-semibold uppercase ${colors.text}`}>
                      {node.category}
                    </span>
                  </div>
                  <h4 className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                    {node.label}
                  </h4>
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-200/60 pt-1.5 text-[10px] dark:border-slate-800/60">
                    <span className="text-slate-500">
                      {compareMode === "agent" ? "Agent" : compareMode === "human" ? "Human" : "Traversal"}:
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {compareMode === "agent"
                        ? `${node.agentFrequencyPct}%`
                        : compareMode === "human"
                        ? `${node.humanFrequencyPct}%`
                        : `${Math.round((node.humanFrequencyPct + node.agentFrequencyPct) / 2)}%`}
                    </span>
                  </div>
                </button>
                {i < nodes.length - 1 && (
                  <div className="text-slate-300 dark:text-slate-700 px-1 font-bold text-xs select-none">
                    →
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Step Detail Inspector */}
      {selectedNode && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase text-indigo-600 dark:text-indigo-400">
                Action Step Analysis
              </span>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {selectedNode.label}
              </h4>
            </div>
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500">Human Execution Rate:</span>{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.humanFrequencyPct}%</span>
              </div>
              <div>
                <span className="text-slate-500">Agent Execution Rate:</span>{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.agentFrequencyPct}%</span>
              </div>
              <div>
                <span className="text-slate-500">Mean Step Latency:</span>{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedNode.averageLatencySeconds}s</span>
              </div>
            </div>
          </div>
          {selectedNode.commonFailureReason && (
            <div className="mt-3 flex items-center gap-2 rounded border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
              <span className="font-bold">Common Failure Bottleneck:</span>
              <span>{selectedNode.commonFailureReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
