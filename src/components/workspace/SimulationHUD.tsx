"use client";

import React from "react";
import { ThemeToggle } from "../ui/ThemeProvider.tsx";

interface SimulationHUDProps {
  scenarioId: string;
  contextLabel: string;
  minute: number;
  cashMinor: number;
  budgetCommittedMinor: number;
  budgetLimitMinor?: number;
  inboundMessageCount: number;
  pendingPoCount: number;
  pendingDeliveryCount: number;
  revision: number;
  onAdvanceTime: (minutes: number) => void;
  onOpenCommandPalette: () => void;
  onOpenAuditDrawer?: () => void;
  isAdvancing?: boolean;
}

export function SimulationHUD({
  scenarioId,
  contextLabel,
  minute,
  cashMinor,
  budgetCommittedMinor,
  budgetLimitMinor = 2500000, // $25,000 default budget ceiling
  inboundMessageCount,
  pendingPoCount,
  pendingDeliveryCount,
  revision,
  onAdvanceTime,
  onOpenCommandPalette,
  onOpenAuditDrawer,
  isAdvancing = false,
}: SimulationHUDProps) {
  // Domain time is continuous logical minutes; day boundaries are 1,440 minutes.
  const dayNumber = Math.floor(minute / (24 * 60));
  const dayMinutes = minute % (24 * 60);
  const hours = Math.floor(dayMinutes / 60);
  const mins = dayMinutes % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const timeFormatted = `${displayHours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${ampm}`;

  const cashFormatted = (cashMinor / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });
  const budgetCommittedFormatted = (budgetCommittedMinor / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
  });

  const budgetPct = Math.min(100, Math.round((budgetCommittedMinor / budgetLimitMinor) * 100));

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-2.5 backdrop-blur-md shadow-xs dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
      {/* Left: Scenario Badge & Clock */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {scenarioId}
          </span>
          <span className="hidden sm:inline-block text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">
            {contextLabel}
          </span>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />

        {/* Logical Clock */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <svg className="w-3.5 h-3.5 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Day {dayNumber} · {timeFormatted}</span>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">({minute}m)</div>
          </div>

          {/* Quick time controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isAdvancing}
              onClick={() => onAdvanceTime(30)}
              className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
              title="Advance 30 simulated minutes"
            >
              +30m
            </button>
            <button
              type="button"
              disabled={isAdvancing}
              onClick={() => onAdvanceTime(60)}
              className="rounded bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
              title="Advance 1 simulated hour"
            >
              +1h
            </button>
          </div>
        </div>
      </div>

      {/* Middle: Financial & Operational Vitals */}
      <div className="flex items-center gap-4 text-xs">
        {/* Cash Balance */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400">Cash:</span>
          <div className={`font-semibold ${cashMinor < 500000 ? "text-rose-600 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"}`}>
            {cashFormatted}
          </div>
        </div>

        {/* Committed Budget */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400">Committed:</span>
          <div className="font-semibold text-slate-800 dark:text-slate-200">
            {budgetCommittedFormatted}
          </div>
          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPct > 80 ? "bg-rose-500" : budgetPct > 50 ? "bg-amber-500" : "bg-indigo-500"
              }`}
              style={{ width: `${budgetPct}%` }}
            />
          </div>
        </div>

        {/* Alerts: Inbox & Pending POs */}
        <div className="flex items-center gap-2">
          {inboundMessageCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              {inboundMessageCount} inbound
            </span>
          ) : null}

          {pendingPoCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              {pendingPoCount} PO pending
            </span>
          ) : null}

          {pendingDeliveryCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {pendingDeliveryCount} delivery
            </span>
          ) : null}
        </div>
      </div>

      {/* Right: Actions, Palette, Drawer & Theme */}
      <div className="flex items-center gap-2">
        {/* Command Palette Trigger */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
          title="Open Command Palette (Cmd+K or Ctrl+K)"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="hidden sm:inline">Commands</span>
          <kbd className="rounded bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700">
            ⌘K
          </kbd>
        </button>

        {/* Audit Drawer Trigger */}
        {onOpenAuditDrawer ? (
          <button
            type="button"
            onClick={onOpenAuditDrawer}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            title="Inspect audit timeline and event log"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="text-[11px] font-semibold">r{revision}</div>
          </button>
        ) : null}

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
