import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">WorkWorld</h1>
      <p className="mt-3 text-lg text-slate-700">
        Executable professional-work simulations for small-business operations.
      </p>
      <p className="mt-6 text-sm text-slate-600">
        Bootstrap route is live. The workspace is under construction — see
        docs/MILESTONES.md for build state.
      </p>
      <p className="mt-4">
        <Link
          href="/health"
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          Health endpoint
        </Link>
      </p>
    </main>
  );
}
