"use client";

import { useEffect, useState } from "react";
import { Button, Card, Tag } from "../../components/workspace/ui.tsx";

interface RunRow {
  runId: string;
  scenarioId: string;
  condition: string;
  createdAt: string;
  assessed: boolean;
}

const CRITERIA = [
  { id: "C1", label: "Decision quality under constraints" },
  { id: "C2", label: "Communication clarity & honesty" },
  { id: "C3", label: "Evidence/record discipline" },
  { id: "C4", label: "Prioritization when requirements changed" },
  { id: "C5", label: "Professional judgment in ambiguity" },
];

export default function AssessorPage() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<{
    report: {
      deterministic: { outcome: string; checks: { id: string; passed: boolean; detail: string }[] };
    };
    assessment: { revisions: { assessor: string; ratedAt: string; comment: string }[] };
    evidence: {
      actionLog: { type: string; outcome: string; atMinute: number; errors: string[] }[];
      submission: { summary: string } | null;
      clockMinute: number;
    };
  } | null>(null);
  const [assessor, setAssessor] = useState("");
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/assessor")
      .then((r) => r.json())
      .then((d) => setRuns(d.runs ?? []));
  }, []);

  async function selectRun(runId: string) {
    setSelected(runId);
    setStatus(null);
    const res = await fetch(`/api/assessor?action=report&runId=${runId}`, { method: "PATCH" });
    const data = await res.json();
    setEvidence(res.ok ? data : null);
  }

  async function submitRubric() {
    if (!selected) return;
    const payload = {
      runId: selected,
      assessor,
      ratings: CRITERIA.map((c) => ({
        criterion: c.id,
        rating: ratings[c.id] ?? 3,
        comment: comments[c.id] ?? "",
      })),
      comment,
    };
    const res = await fetch("/api/assessor", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setStatus(res.ok ? `Judgment recorded (revision ${data.revisionCount}).` : `Rejected: ${data.error}`);
    if (res.ok) selectRun(selected);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          WorkWorld · assessor workspace
        </p>
        <h1 className="mt-1 text-2xl font-bold">Review completed work</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Deterministic checks (T1) read the business state and cannot be overridden here. Your
          rubric is a separate, attributable judgment with an audited revision history. Model
          suggestions (if any) are labeled uncalibrated and never recorded as your judgment.
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <Card title="Runs">
          <ul className="space-y-2">
            {runs.map((r) => (
              <li key={r.runId}>
                <button
                  onClick={() => selectRun(r.runId)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                    selected === r.runId ? "border-indigo-500 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-mono text-xs">{r.runId.slice(0, 8)}</span>
                  <span className="ml-2 font-medium">{r.scenarioId}</span>
                  <span className="ml-2 text-xs text-slate-500">{r.condition}</span>
                  {r.assessed ? <span className="float-right"><Tag tone="ok">assessed</Tag></span> : null}
                </button>
              </li>
            ))}
            {runs.length === 0 ? <li className="text-sm text-slate-500">No runs yet.</li> : null}
          </ul>
        </Card>

        <div className="space-y-4">
          {!evidence ? (
            <Card title="Evidence">
              <p className="text-sm text-slate-500">Select a run to inspect its evidence.</p>
            </Card>
          ) : (
            <>
              <Card title="Deterministic outcome (read-only)">
                <Tag tone={evidence.report.deterministic.outcome === "pass" ? "ok" : "bad"}>
                  {evidence.report.deterministic.outcome.toUpperCase()}
                </Tag>
                <ul className="mt-2 space-y-1">
                  {evidence.report.deterministic.checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-xs">
                      <Tag tone={c.passed ? "ok" : "bad"}>{c.passed ? "pass" : "fail"}</Tag>
                      <span>
                        <span className="font-mono">{c.id}</span>
                        <span className="block text-slate-500">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card title="Action log (evidence)">
                <ul className="max-h-64 space-y-1 overflow-auto text-xs">
                  {evidence.evidence.actionLog.map((a, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="text-slate-400">m{a.atMinute}</span>
                      <span className="font-mono">{a.type}</span>
                      <Tag tone={a.outcome === "applied" ? "ok" : "bad"}>{a.outcome}</Tag>
                      {a.errors.length ? <span className="text-rose-600">{a.errors.join(",")}</span> : null}
                    </li>
                  ))}
                </ul>
                {evidence.evidence.submission ? (
                  <p className="mt-2 rounded bg-slate-50 p-2 text-xs">
                    Submission: {evidence.evidence.submission.summary}
                  </p>
                ) : null}
              </Card>

              <Card title="Rubric judgment (attributable, append-only revisions)">
                <Field label="Your name / assessor id (required)">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    value={assessor}
                    onChange={(e) => setAssessor(e.target.value)}
                  />
                </Field>
                <div className="mt-3 space-y-3">
                  {CRITERIA.map((c) => (
                    <div key={c.id}>
                      <p className="text-sm font-medium">
                        {c.id} — {c.label}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <label key={n} className="flex items-center gap-1 text-sm">
                            <input
                              type="radio"
                              name={c.id}
                              checked={(ratings[c.id] ?? 3) === n}
                              onChange={() => setRatings({ ...ratings, [c.id]: n })}
                              aria-label={`${c.id} rating ${n}`}
                            />
                            {n}
                          </label>
                        ))}
                        <input
                          className="ml-2 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                          placeholder="comment"
                          value={comments[c.id] ?? ""}
                          onChange={(e) => setComments({ ...comments, [c.id]: e.target.value })}
                          aria-label={`${c.id} comment`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Field label="Overall comment">
                  <textarea
                    className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </Field>
                <div className="mt-2 flex items-center gap-3">
                  <Button onClick={submitRubric} disabled={!assessor}>
                    Record judgment (new revision)
                  </Button>
                  {status ? (
                    <span role="status" className="text-sm text-slate-600">
                      {status}
                    </span>
                  ) : null}
                </div>
                {evidence.assessment.revisions.length > 0 ? (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">Decision history</h3>
                    <ul className="mt-1 space-y-1 text-xs">
                      {evidence.assessment.revisions.map((rev, i) => (
                        <li key={i} className="rounded bg-slate-50 p-2">
                          <strong>{rev.assessor}</strong> · {rev.ratedAt}
                          <span className="block text-slate-600">{rev.comment}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
