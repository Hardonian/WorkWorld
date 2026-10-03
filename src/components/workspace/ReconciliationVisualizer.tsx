"use client";

import React from "react";
import type { LedgerTxn } from "../../domain/types.ts";
import type { Balances } from "../../domain/ledger.ts";

interface ReconciliationVisualizerProps {
  balances: Balances;
  openingEquityMinor: number;
  transactions: LedgerTxn[];
  currency?: string;
}

export function ReconciliationVisualizer({
  balances,
  openingEquityMinor,
  transactions,
  currency = "CAD",
}: ReconciliationVisualizerProps) {
  const formatMinor = (minor: number) =>
    (minor / 100).toLocaleString("en-CA", { style: "currency", currency });

  const totalAssets =
    (balances.cash ?? 0) +
    (balances.accounts_receivable ?? 0) +
    (balances.inventory ?? 0);

  const totalLiabilitiesAndEquity =
    (balances.accounts_payable ?? 0) + openingEquityMinor;

  const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 1; // minor precision

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Financial Health &amp; General Ledger Reconciliation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Double-entry verification: Assets = Liabilities + Opening Equity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isBalanced
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isBalanced ? "bg-emerald-500 animate-pulse" : "bg-rose-500 animate-ping"
              }`}
            />
            {isBalanced ? "Ledger Balanced (Exact Invariant)" : "Variance Detected!"}
          </span>
        </div>
      </div>

      {/* T-Accounts Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Cash */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Asset
            </span>
            <span className="font-mono text-slate-400">#1010</span>
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Cash on Hand
          </h4>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatMinor(balances.cash ?? 0)}
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">Asset</span>
            <span className="font-mono text-slate-400">#1100</span>
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">Accounts Receivable</h4>
          <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
            {formatMinor(balances.accounts_receivable ?? 0)}
          </p>
        </div>

        {/* Inventory */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Asset
            </span>
            <span className="font-mono text-slate-400">#1200</span>
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Merchandise Inventory
          </h4>
          <p className="mt-2 text-xl font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {formatMinor(balances.inventory ?? 0)}
          </p>
        </div>

        {/* Accounts Payable */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Liability
            </span>
            <span className="font-mono text-slate-400">#2010</span>
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Accounts Payable
          </h4>
          <p className="mt-2 text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {formatMinor(balances.accounts_payable ?? 0)}
          </p>
        </div>

        {/* Opening Equity */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
              Equity
            </span>
            <span className="font-mono text-slate-400">#3010</span>
          </div>
          <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
            Opening Equity
          </h4>
          <p className="mt-2 text-xl font-bold font-mono text-slate-700 dark:text-slate-300">
            {formatMinor(openingEquityMinor)}
          </p>
        </div>
      </div>

      {/* Accounting Invariant Formula Bar */}
      <div className="mt-5 rounded-lg bg-slate-100 p-3 text-xs dark:bg-slate-800/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span>Assets: <strong>{formatMinor(totalAssets)}</strong></span>
          <span className="text-slate-400">=</span>
          <span>Liabilities: <strong>{formatMinor(balances.accounts_payable ?? 0)}</strong></span>
          <span className="text-slate-400">+</span>
          <span>Opening equity: <strong>{formatMinor(openingEquityMinor)}</strong></span>
        </div>
        <span className="text-slate-500 dark:text-slate-400 font-sans">
          {transactions.length} reconciled journal entries recorded
        </span>
      </div>
    </div>
  );
}
