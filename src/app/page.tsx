import Link from "next/link";
import { listScenarios } from "../scenarios/catalog.ts";
import StartButton from "../components/home/StartButton.tsx";

export default function Home() {
  const scenarios = listScenarios();
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="border-b border-slate-200 pb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-700">
          WorkWorld · working title
        </p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
          Executable professional-work simulations
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-slate-700">
          Complete consequential operations work in a persistent environment — orders, deliveries,
          invoices, ledgers, tickets, sheets — and see outcome evidence that grades the{" "}
          <em>business state</em>, not the polish of the report.
        </p>
        <p className="mt-4 text-sm text-slate-600">
          This demo is <strong>credentials-free</strong> with <strong>synthetic company data</strong>.
          Each browser session is isolated and stored server-side (demo file store) so your work
          survives refresh. It is a training/evaluation harness — not an employment assessment.
        </p>
      </header>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Small-business operations apprenticeship</h2>
        <p className="mt-1 text-sm text-slate-600">
          Role: Operations Coordinator at Northline Supply Co. (synthetic). Three scenario families,
          six episodes. Start with the guided routine episode.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {scenarios.map((s, i) => (
            <article
              key={s.id}
              className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {s.id} · {s.family.replace(/_/g, " ")}
                </p>
                {i === 0 ? (
                  <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
                    guided start
                  </span>
                ) : null}
              </div>
              <h3 className="mt-1 text-lg font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-600">{s.brief.situation}</p>
              <ul className="mt-3 space-y-1 text-xs text-slate-500">
                {s.brief.objectives.slice(0, 2).map((o) => (
                  <li key={o}>• {o}</li>
                ))}
              </ul>
              <div className="mt-4">
                <StartButton
                  scenarioId={s.id}
                  label={i === 0 ? "Start guided episode" : "Start episode"}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">How assessment works</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>
            <strong>Deterministic outcome checks</strong> read the actual state: authorization,
            document consistency, no duplicate settlement, exact balances, feasible commitments,
            required updates, evidence preservation, budget.
          </li>
          <li>
            <strong>A polished report cannot conceal wrong business state</strong> — quality never
            flips a fatal failure.
          </li>
          <li>
            <strong>Human rubric</strong> (communication, judgment, prioritization) is recorded
            separately by an assessor.
          </li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          Deterministic checks verify narrow tested properties only. Nothing here is verified skill,
          employability, accreditation, or hiring suitability.
        </p>
      </section>

      <footer className="mt-10 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6 text-sm">
        <Link href="/workspace" className="text-indigo-700 hover:underline">
          Open workspace
        </Link>
        <Link href="/health" className="text-indigo-700 hover:underline">
          Health endpoint
        </Link>
        <span className="text-slate-500">
          Evaluator interface: see docs/ARCHITECTURE.md (reset / observe / step / checkpoint /
          restore / grade).
        </span>
      </footer>
    </main>
  );
}
