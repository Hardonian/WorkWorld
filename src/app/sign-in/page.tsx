"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { getBrowserSupabaseClient } from "../../lib/supabase-browser.ts";

export const metadata = { title: "Sign in — WorkWorld" };

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = getBrowserSupabaseClient();
    if (!client) {
      setStatus("error");
      setMessage("Hosted sign-in is not configured for this environment.");
      return;
    }

    setStatus("sending");
    setMessage("");
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for a single-use sign-in link.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300">
          ← WorkWorld Index
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.16em] text-indigo-600 dark:text-indigo-300">Private workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Sign in</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Enter the email address provisioned by your organization. We’ll send a single-use sign-in link.
        </p>
        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100" htmlFor="email">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none ring-indigo-500 transition focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Sending…" : status === "sent" ? "Link sent" : "Email me a sign-in link"}
          </button>
        </form>
        {message ? (
          <p className={`mt-4 text-sm ${status === "error" ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"}`} role="status">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  );
}
