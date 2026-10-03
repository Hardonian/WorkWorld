"use client";

import React, { useState } from "react";

export interface ConsentModalProps {
  isOpen: boolean;
  onConsentAccepted: () => void;
  onConsentDeclined?: () => void;
}

export function ConsentModal({ isOpen, onConsentAccepted, onConsentDeclined }: ConsentModalProps) {
  const [agreed, setAgreed] = useState(false);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Participant informed consent"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in-0"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
            📋
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Participant Informed Consent
            </h2>
            <p className="text-xs text-slate-500">
              WorkWorld Human-AI Comparative Apprenticeship Study (IRB Protocol #2026-OPS-04)
            </p>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400 space-y-2">
          <p>
            <strong>Purpose:</strong> You are participating in a research study evaluating human operational reasoning alongside autonomous AI agents in simulated small-business environments.
          </p>
          <p>
            <strong>Data Collection:</strong> We record timestamped actions, decision latencies, written work notes, and final accounting reconciliations. No personal identifying information (PII) is shared or published.
          </p>
          <p>
            <strong>Voluntary Participation:</strong> Your participation is completely voluntary. You may withdraw at any time without penalty or loss of benefits.
          </p>
          <p>
            <strong>Confidentiality:</strong> All evaluation records are anonymized using cryptographically blinded tokens prior to assessor evaluation.
          </p>
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700"
          />
          <span>I have read the research protocol and voluntarily consent to participate.</span>
        </label>

        <div className="flex justify-end gap-2 pt-2">
          {onConsentDeclined ? (
            <button
              type="button"
              onClick={onConsentDeclined}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              Decline &amp; Exit
            </button>
          ) : null}
          <button
            type="button"
            disabled={!agreed}
            onClick={onConsentAccepted}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            I Agree &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
