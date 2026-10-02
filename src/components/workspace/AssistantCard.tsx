"use client";

import { useState } from "react";
import { Button, Card, Tag } from "./ui.tsx";
import type { Observation } from "../../domain/observation.ts";

interface SuggestionView {
  proposedAction: Record<string, unknown> | null;
  notes: string;
  advice: string | null;
  handoff: string | null;
  parseError: string | null;
  usage: { totalTokens: number; costMinor: number | null; pricingSource: string };
  provider: string;
  model: string;
  fixture: boolean;
}

/**
 * Assisted mode: the human retains responsibility. Suggestions are inspectable;
 * NOTHING runs until the human explicitly applies it.
 */
export default function AssistantCard({
  act,
  status,
}: {
  act: (payload: Record<string, unknown>) => Promise<void>;
  status: string;
}) {
  const [suggestion, setSuggestion] = useState<SuggestionView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Card title="Assistant (you stay responsible)">
      <p className="text-xs text-slate-500">
        Suggestions are proposals only — nothing executes until you apply one. Advice and executed
        actions are recorded separately.
      </p>
      <div className="mt-2">
        <Button
          variant="secondary"
          disabled={busy || status !== "active"}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await fetch("/api/assist", { method: "POST" });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error ?? "assistant unavailable");
                setSuggestion(null);
              } else {
                setSuggestion(data.suggestion);
              }
            } catch {
              setError("assistant request failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Thinking…" : "Ask the assistant"}
        </Button>
      </div>

      {error ? (
        <p role="status" className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          {error}
        </p>
      ) : null}

      {suggestion ? (
        <div className="mt-3 space-y-2 rounded-md bg-slate-50 p-2 text-xs">
          <div className="flex flex-wrap items-center gap-1">
            <Tag tone={suggestion.fixture ? "warn" : "info"}>
              {suggestion.provider}/{suggestion.model}
            </Tag>
            <Tag tone="info">{suggestion.usage.totalTokens} tokens</Tag>
            <Tag tone={suggestion.usage.costMinor === null ? "warn" : "ok"}>
              {suggestion.usage.costMinor === null
                ? suggestion.usage.pricingSource
                : `cost ${suggestion.usage.costMinor} minor`}
            </Tag>
          </div>
          {suggestion.notes ? <p className="text-slate-700">Rationale: {suggestion.notes}</p> : null}
          {suggestion.advice ? <p className="text-slate-700">Advice: {suggestion.advice}</p> : null}
          {suggestion.handoff ? (
            <p className="rounded border border-amber-200 bg-amber-50 p-1.5 text-amber-800">
              Requests your decision: {suggestion.handoff}
            </p>
          ) : null}
          {suggestion.parseError ? <p className="text-rose-700">{suggestion.parseError}</p> : null}
          {suggestion.proposedAction ? (
            <>
              <details>
                <summary className="cursor-pointer font-medium text-slate-700">
                  Inspect proposed action
                </summary>
                <pre className="mt-1 overflow-auto rounded bg-white p-2 text-[11px]">
                  {JSON.stringify(suggestion.proposedAction, null, 2)}
                </pre>
              </details>
              <Button
                onClick={() => {
                  if (suggestion.proposedAction) act(suggestion.proposedAction);
                }}
              >
                Apply suggestion (executes as assisted)
              </Button>
            </>
          ) : (
            <p className="text-slate-500">Advice only — nothing to execute.</p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
