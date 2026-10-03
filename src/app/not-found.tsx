import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">404 · Route not found</p>
      <h1 className="mt-2 text-3xl font-extrabold">This WorkWorld surface does not exist</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Return to the episode catalog or resume the current workspace.</p>
      <div className="mt-6 flex gap-3"><Link href="/" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Episode catalog</Link><Link href="/workspace" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Workspace</Link></div>
    </main>
  );
}
