"use client";

import { useState, useSyncExternalStore } from "react";

export interface TourStep {
  title: string;
  description: string;
  targetArea: string;
  badge: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    badge: "Step 1 of 5",
    title: "Simulation Status HUD",
    description: "The top status bar tracks logical clock time, remaining cash, and budget utilization in real-time. Keep cash positive and stay within policy limits.",
    targetArea: "Top Header HUD",
  },
  {
    badge: "Step 2 of 5",
    title: "Multi-Panel Docking Workspace",
    description: "Inspect POs, delivery slips, and vendor invoices side-by-side. Verify items, quantities, and pricing tolerances before approving payment.",
    targetArea: "Workspace Split Tabs",
  },
  {
    badge: "Step 3 of 5",
    title: "Universal Command Palette (Cmd+K / Ctrl+K)",
    description: "Press Cmd+K anywhere to instantly search supplier catalogs, trigger rapid actions, switch scenarios, or view keyboard shortcuts.",
    targetArea: "Global Shortcuts",
  },
  {
    badge: "Step 4 of 5",
    title: "Double-Entry Reconciliation Ledger",
    description: "All payments and accruals post directly to standard debit/credit T-accounts. The simulation guarantees mathematical equilibrium at every step.",
    targetArea: "Reconciliation Visualizer",
  },
  {
    badge: "Step 5 of 5",
    title: "Cryptographic Outcome Verification",
    description: "When finished, submit your final report to receive a machine-checked assessment manifest with verifiable rubric breakdown.",
    targetArea: "Submission Drawer",
  },
];

export function OnboardingTour({ onComplete }: { onComplete?: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const shouldShow = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    () => {
      try {
        return !localStorage.getItem("workworld_tour_seen");
      } catch {
        return false;
      }
    },
    () => false,
  );

  const isOpen = shouldShow && !dismissed;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("workworld_tour_seen", "true");
    } catch {
      // Ignore in private browsing
    }
    setDismissed(true);
    onComplete?.();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStepIndex]!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            {step.badge}
          </span>
          <button
            onClick={handleDismiss}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            Skip Tour ✕
          </button>
        </div>

        <div className="py-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Focus: {step.targetArea}
          </span>
          <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {step.description}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="my-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        <div className="mt-4 flex items-center justify-between pt-2">
          <button
            disabled={currentStepIndex === 0}
            onClick={handlePrev}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Previous
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? "Get Started" : "Next Step →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
