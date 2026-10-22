"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
    <Link href="/" className="text-sm font-semibold text-indigo-600">WorkWorld Index</Link>
    <h1 className="mt-6 text-3xl font-bold">Sign in to your workspace</h1>
    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Use the account invited by your workspace administrator. Access to runs and assessments follows your organization membership.</p>
    <form className="mt-8 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setError(null);
      const form = new FormData(event.currentTarget);
      try {
        const response = await fetch("/api/auth/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: form.get("email"), password: form.get("password") }) });
        const data = await response.json();
        if (!response.ok) { setError(data.error ?? "Sign in is temporarily unavailable."); return; }
        router.replace("/workspace"); router.refresh();
      } catch { setError("Could not reach the service. Please try again."); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-medium">Email<input name="email" type="email" autoComplete="username" required maxLength={320} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2" /></label>
      <label className="block text-sm font-medium">Password<input name="password" type="password" autoComplete="current-password" required maxLength={1024} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2" /></label>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
    <p className="mt-5 text-xs text-slate-500">Need an invitation or a password reset? Contact your workspace administrator.</p>
  </main>;
}
