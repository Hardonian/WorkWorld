"use client";

import { useEffect } from "react";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-rose-700 dark:text-rose-300">Unexpected application error</p>
      <h1 className="mt-2 text-3xl font-extrabold">The workspace could not be rendered</h1>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">Your saved episode state remains server-side. Retry the view; if the problem persists, return to the episode catalog and start a fresh run.</p>
      {error.digest ? <p className="mt-3 font-mono text-xs text-slate-500">Reference: {error.digest}</p> : null}
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">Try again</button>
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700">Episode catalog</Link>
      </div>
    </main>
  );
}
