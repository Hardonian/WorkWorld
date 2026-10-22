import Link from "next/link";
import type { Metadata } from "next";
import StartButton from "../components/home/StartButton.tsx";
import { ThemeToggle } from "../components/ui/ThemeProvider.tsx";
import { indexSuites, publicRuns } from "../index/registry.ts";

export const metadata: Metadata = {
  title: "WorkWorld Index — Agent reliability, with evidence",
  description: "A public, replayable reliability benchmark for AI agents doing real business workflows.",
};

const metrics = [
  ["Completion", "Did it actually finish the workflow?"],
  ["Safety", "Did it violate a policy, or avoid a dangerous action?"],
  ["Cost", "What did a completed run cost under a declared budget?"],
  ["Recovery", "Could it hand off or recover when the straight path broke?"],
  ["Replay", "Can an evaluator inspect exactly what happened?"],
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-[#f7f8fc]/90 px-6 py-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-black text-white shadow-lg shadow-indigo-500/20 dark:bg-indigo-400 dark:text-slate-950">W</span>
            <span className="font-bold tracking-tight">WorkWorld <span className="text-indigo-600 dark:text-indigo-400">Index</span></span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold text-slate-600 md:flex dark:text-slate-300">
            <a href="#method" className="hover:text-indigo-600">Method</a>
            <Link href="/leaderboard" className="hover:text-indigo-600">Leaderboard</Link>
            <Link href="/roi" className="hover:text-indigo-600">ROI model</Link>
            <Link href="/certify" className="hover:text-indigo-600">Certify your agent</Link>
            <Link href="/sign-in" className="hover:text-indigo-600">Sign in</Link>
            <ThemeToggle />
          </nav>
          <Link href="/certify" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 dark:bg-indigo-400 dark:text-slate-950 md:hidden">Certify</Link>
        </div>
      </header>

      <main>
        <section className="relative px-6 pb-20 pt-16 sm:pb-28 sm:pt-24">
          <div className="absolute inset-x-0 top-0 -z-10 h-[34rem] bg-[radial-gradient(circle_at_50%_5%,rgba(129,140,248,.22),transparent_46%)] dark:bg-[radial-gradient(circle_at_50%_5%,rgba(99,102,241,.20),transparent_46%)]" />
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1fr_.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/70 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Public evidence index</div>
              <h1 className="mt-7 max-w-3xl text-5xl font-black tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl dark:text-white">Can this agent do the work?</h1>
              <p className="mt-6 max-w-2xl text-xl leading-relaxed text-slate-600 dark:text-slate-300">WorkWorld Index measures whether AI agents complete real business workflows <strong className="font-semibold text-slate-900 dark:text-white">safely, reproducibly, and within budget.</strong></p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/leaderboard" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 transition hover:-translate-y-0.5 hover:bg-indigo-700">Explore the Index <span aria-hidden>→</span></Link>
                <Link href="/certify" className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">Bring your agent</Link>
                <StartButton scenarioId="A1" label="Try a workflow" />
              </div>
              <p className="mt-5 text-xs text-slate-500">No modeled estimates. Every published result must carry a configuration and replay artifact.</p>
            </div>

            <div className="relative rounded-3xl border border-slate-200 bg-slate-950 p-5 text-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 sm:p-7">
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-indigo-500/25 blur-3xl" />
              <div className="relative flex items-center justify-between border-b border-white/10 pb-4"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-indigo-300">Reliability card</p><h2 className="mt-1 text-lg font-bold">A run you can inspect</h2></div><span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-bold text-emerald-300">Verified control</span></div>
              <div className="relative mt-5 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-slate-400">Completion</p><p className="mt-1 text-2xl font-black">6 / 6</p><p className="text-xs text-emerald-300">public episodes</p></div>
                <div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-slate-400">Fatal policy misses</p><p className="mt-1 text-2xl font-black">0</p><p className="text-xs text-emerald-300">baseline control</p></div>
                <div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-slate-400">Cost / completed run</p><p className="mt-1 text-2xl font-black">$0.00</p><p className="text-xs text-slate-400">fixture; not a model result</p></div>
                <div className="rounded-2xl bg-white/8 p-4"><p className="text-xs text-slate-400">Replay consistency</p><p className="mt-1 text-2xl font-black">100%</p><p className="text-xs text-indigo-300">fixed seed + manifest</p></div>
              </div>
              <div className="relative mt-5 rounded-xl border border-white/10 bg-black/20 px-4 py-3 font-mono text-xs text-slate-300">state_digest: e12efe344372076b… <span className="float-right text-indigo-300">open evidence ↗</span></div>
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-6 py-7 dark:border-slate-800 dark:bg-slate-900/60"><div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3"><p className="text-sm font-semibold"><span className="mr-2 text-indigo-600">01</span>Fixed, versioned scenarios</p><p className="text-sm font-semibold"><span className="mr-2 text-indigo-600">02</span>Bounded spend and action policy</p><p className="text-sm font-semibold"><span className="mr-2 text-indigo-600">03</span>Replayable evidence by default</p></div></section>

        <section id="method" className="mx-auto max-w-7xl px-6 py-20 sm:py-28">
          <div className="max-w-2xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">The benchmark</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Business work that has consequences.</h2><p className="mt-4 leading-relaxed text-slate-600 dark:text-slate-400">The Index starts narrow: three operational suites with real state, policy constraints, and a deterministic grader. Agents must act—not merely produce a persuasive response.</p></div>
          <div className="mt-10 grid gap-5 lg:grid-cols-3">{indexSuites.map((suite, index) => {
            const episodeIds = suite.id === "purchasing" ? ["A1", "A2"] : suite.id === "reconciliation" ? ["B1", "B2"] : ["C1", "C2"];
            return <article key={suite.id} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><span className="font-mono text-xs text-slate-400">0{index + 1}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{suite.episodes}</span></div><h3 className="mt-8 text-2xl font-bold">{suite.name}</h3><p className="mt-3 min-h-12 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{suite.description}</p><div className="mt-6 flex flex-wrap gap-2">{suite.checks.map((check) => <span key={check} className="rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{check}</span>)}</div><div className="mt-6 flex flex-wrap gap-2">{episodeIds.map((id) => <StartButton key={id} scenarioId={id} label={`Run ${id}`} ariaLabel={`Run benchmark episode ${id}`} />)}</div></article>;
          })}</div>
        </section>

        <section className="bg-slate-950 px-6 py-20 text-white sm:py-28"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">What gets measured</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">A leaderboard without the hand-waving.</h2><p className="mt-4 max-w-md text-slate-300">One score obscures what matters. WorkWorld Index reports the dimensions a buyer needs to weigh.</p><Link href="/leaderboard" className="mt-7 inline-flex text-sm font-bold text-indigo-300 hover:text-white">See the public evidence →</Link></div><div className="grid gap-3 sm:grid-cols-2">{metrics.map(([metric, detail], index) => <div key={metric} className={`rounded-2xl border border-white/10 p-5 ${index === 4 ? "sm:col-span-2" : ""}`}><p className="font-bold">{metric}</p><p className="mt-2 text-sm leading-relaxed text-slate-400">{detail}</p></div>)}</div></div></section>

        <section className="mx-auto max-w-7xl px-6 py-20 sm:py-28"><div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-7 sm:p-10 dark:border-indigo-950 dark:bg-indigo-950/40"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">Private certification</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight">Prove your operating envelope before a buyer asks.</h2><p className="mt-4 max-w-2xl leading-relaxed text-slate-600 dark:text-slate-300">Use the same suites and evidence protocol in a private workspace. Start with a bounded preflight manifest—no credentials, prompts, or customer data are exported.</p></div><Link href="/certify" className="self-start rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 lg:self-auto">Start private preflight</Link></div></div></section>

        <section className="mx-auto max-w-7xl px-6 pb-20"><div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-8 text-xs text-slate-500 dark:border-slate-800"><span>WorkWorld Index · public benchmark layer built on the WorkWorld simulation substrate</span><div className="flex gap-4"><Link href={`/runs/${publicRuns[0].id}`}>Baseline evidence</Link><Link href="/docs">Developer docs</Link><Link href="/workspace">Simulation workspace</Link></div></div></section>
      </main>
    </div>
  );
}
