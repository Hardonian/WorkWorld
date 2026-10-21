import Link from "next/link";
import type { Metadata } from "next";
import { CertificationConfigurator } from "../../components/index/CertificationConfigurator.tsx";

export const metadata: Metadata = {
  title: "Private certification workspace · WorkWorld Index",
  description: "Prepare a bounded, private WorkWorld Index certification evaluation for your AI agent.",
};

export default function CertifyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-16">
      <div className="mx-auto max-w-5xl">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">← WorkWorld Index</Link>
        <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Certification workspace</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">Know the operating envelope before production.</h1>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 dark:text-slate-400">Run the same fixed suites, budget limits, safety checks, and evidence protocol behind the public Index—without publishing your configuration or artifacts. Hosted workspaces require a signed-in account before a preflight can be prepared.</p>
            <ol className="mt-8 space-y-5 border-l border-slate-200 pl-5 text-sm dark:border-slate-800">
              <li><strong>1. Define the boundary.</strong><br /><span className="text-slate-500 dark:text-slate-400">Name the adapter, fix the suite version, and cap spend before the first action.</span></li>
              <li><strong>2. Run in your environment.</strong><br /><span className="text-slate-500 dark:text-slate-400">Keep credentials in your controlled runner. WorkWorld records only the declared policy and evidence you choose to submit.</span></li>
              <li><strong>3. Review the reliability card.</strong><br /><span className="text-slate-500 dark:text-slate-400">Compare completion, policy failures, interventions, cost, latency, and replay consistency.</span></li>
            </ol>
          </section>
          <CertificationConfigurator />
        </div>
      </div>
    </main>
  );
}
