"use client";

import React from "react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: "⌘ K / Ctrl K", action: "Open universal command palette & search" },
    { key: "1 - 9", action: "Quick-switch workspace tabs (Brief, Inbox, Suppliers...)" },
    { key: "T", action: "Advance logical simulation time by 1 hour (+60m)" },
    { key: "?", action: "Open this keyboard shortcuts cheat-sheet" },
    { key: "Esc", action: "Close active modal, drawer, or palette" },
    { key: "Tab / Shift+Tab", action: "Accessible focus navigation between controls" },
    { key: "Enter / Space", action: "Activate focused button or action" },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold text-sm">
              ?
            </span>
            <h3 id="keyboard-shortcuts-title" className="font-semibold text-slate-900 dark:text-slate-100 text-base">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Close shortcuts modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-2.5 text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">{s.action}</span>
              <kbd className="rounded bg-slate-100 px-2 py-1 font-mono font-semibold text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-slate-100 pt-3 text-right dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
