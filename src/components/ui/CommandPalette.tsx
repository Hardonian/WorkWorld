"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider.tsx";

export interface CommandItem {
  id: string;
  category: "Navigation" | "Workspace Modules" | "Operations" | "Scenarios" | "System";
  title: string;
  description?: string;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: string) => void;
  onAdvanceTime?: (minutes: number) => void;
  activeScenarioId?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
  onSelectTab,
  onAdvanceTime,
  activeScenarioId,
}: CommandPaletteProps) {
  const router = useRouter();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        setSelectedIndex(0);
        setQuery("");
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const defaultCommands: CommandItem[] = [
    // Navigation
    {
      id: "nav-workspace",
      category: "Navigation",
      title: "Go to Workspace",
      description: "Interactive operations environment",
      shortcut: "G W",
      onSelect: () => router.push("/workspace"),
    },
    {
      id: "nav-home",
      category: "Navigation",
      title: "Go to Home / Episode Catalog",
      description: "Select and start simulated episodes",
      shortcut: "G H",
      onSelect: () => router.push("/"),
    },
    {
      id: "nav-assessor",
      category: "Navigation",
      title: "Go to Assessor Workspace",
      description: "Inspect state evidence and evaluate submissions",
      shortcut: "G A",
      onSelect: () => router.push("/assessor"),
    },
    {
      id: "nav-analytics",
      category: "Navigation",
      title: "Go to Evidence Dashboard",
      description: "Review verified readiness facts and open validation gates",
      shortcut: "G D",
      onSelect: () => router.push("/analytics"),
    },
    {
      id: "nav-leaderboard",
      category: "Navigation",
      title: "Go to Evaluation Status",
      description: "See fixture evidence and explicit model-result claim limits",
      shortcut: "G L",
      onSelect: () => router.push("/leaderboard"),
    },
    {
      id: "nav-docs",
      category: "Navigation",
      title: "Go to Documentation Hub",
      description: "Apprentice guide, API reference, grader contract",
      shortcut: "G ?",
      onSelect: () => router.push("/docs"),
    },

    // Workspace Modules (if inside workspace)
    ...(onSelectTab
      ? ([
          {
            id: "mod-brief",
            category: "Workspace Modules",
            title: "View Episode Brief",
            description: "Operating situation, objectives, policies",
            onSelect: () => onSelectTab("brief"),
          },
          {
            id: "mod-inbox",
            category: "Workspace Modules",
            title: "Open Messages Inbox",
            description: "Incoming communications and supplier updates",
            onSelect: () => onSelectTab("inbox"),
          },
          {
            id: "mod-suppliers",
            category: "Workspace Modules",
            title: "Open Supplier Records",
            description: "Approved vendors, catalogs, lead times, terms",
            onSelect: () => onSelectTab("suppliers"),
          },
          {
            id: "mod-pos",
            category: "Workspace Modules",
            title: "Open Purchase Orders",
            description: "Review, draft, amend, and submit POs",
            onSelect: () => onSelectTab("orders"),
          },
          {
            id: "mod-deliveries",
            category: "Workspace Modules",
            title: "Open Deliveries & Receiving",
            description: "Inspect arriving goods and check in inventory",
            onSelect: () => onSelectTab("deliveries"),
          },
          {
            id: "mod-invoices",
            category: "Workspace Modules",
            title: "Open Invoices & Accounts Payable",
            description: "3-way match, dispute, and schedule settlement",
            onSelect: () => onSelectTab("invoices"),
          },
          {
            id: "mod-ledger",
            category: "Workspace Modules",
            title: "Open General Ledger",
            description: "Accrual balances and double-entry transaction log",
            onSelect: () => onSelectTab("ledger"),
          },
          {
            id: "mod-tickets",
            category: "Workspace Modules",
            title: "Open Operations Ticket Board",
            description: "Customer issues and warehouse task tickets",
            onSelect: () => onSelectTab("tickets"),
          },
          {
            id: "mod-sheets",
            category: "Workspace Modules",
            title: "Open Spreadsheet Workbooks",
            description: "Analysis spreadsheets and financial models",
            onSelect: () => onSelectTab("sheets"),
          },
          {
            id: "mod-notes",
            category: "Workspace Modules",
            title: "Open Work Notes Scratchpad",
            description: "Handover notes, draft justifications, audit thoughts",
            onSelect: () => onSelectTab("notes"),
          },
        ] as CommandItem[])
      : []),

    // Operations Quick Actions
    ...(onAdvanceTime
      ? ([
          {
            id: "op-advance-30",
            category: "Operations",
            title: "Advance Logical Time (+30 mins)",
            description: "Progress simulation clock by 30 minutes",
            shortcut: "+30m",
            onSelect: () => onAdvanceTime(30),
          },
          {
            id: "op-advance-60",
            category: "Operations",
            title: "Advance Logical Time (+1 hour)",
            description: "Progress simulation clock by 60 minutes",
            shortcut: "+1h",
            onSelect: () => onAdvanceTime(60),
          },
          {
            id: "op-advance-240",
            category: "Operations",
            title: "Advance Logical Time (+4 hours)",
            description: "Progress simulation clock to next shift",
            shortcut: "+4h",
            onSelect: () => onAdvanceTime(240),
          },
        ] as CommandItem[])
      : []),

    // System Actions
    {
      id: "sys-theme",
      category: "System",
      title: "Toggle Dark / Light Mode",
      description: "Switch visual color scheme",
      onSelect: () => toggleTheme(),
    },
  ];

  const filtered = defaultCommands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].onSelect();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in-0"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden dark:border-slate-800 dark:bg-slate-900 transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <svg
            className="w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
            placeholder="Type a command, search modules, or jump to page..."
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          <kbd className="hidden sm:inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-300 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              No commands or modules found matching &ldquo;{query}&rdquo;
            </div>
          ) : (
            filtered.map((cmd, idx) => (
              <button
                type="button"
                key={cmd.id}
                onClick={() => {
                  cmd.onSelect();
                  onClose();
                }}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm cursor-pointer transition-colors ${
                  idx === selectedIndex
                    ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="flex flex-col">
                  <span className="font-medium flex items-center gap-2">
                    {cmd.title}
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {cmd.category}
                    </span>
                  </span>
                  {cmd.description ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {cmd.description}
                    </span>
                  ) : null}
                </div>
                {cmd.shortcut ? (
                  <kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    {cmd.shortcut}
                  </kbd>
                ) : null}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
          </div>
          {activeScenarioId ? <span>Scenario: <strong>{activeScenarioId}</strong></span> : null}
        </div>
      </div>
    </div>
  );
}
