"use client";

import type { ReactNode } from "react";

export function formatMinor(minor: number, currency = "CAD"): string {
  const neg = minor < 0;
  const abs = Math.abs(minor);
  const s = `${currency} ${(abs / 100).toFixed(2)}`;
  return neg ? `-${s}` : s;
}

export function formatDay(minute: number): string {
  return `Day ${Math.floor(minute / 1440)}`;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  disabled?: boolean;
  type?: "button" | "submit";
  ariaLabel?: string;
}) {
  const styles = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300",
    secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 disabled:text-slate-400",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300",
    ghost: "text-indigo-700 hover:underline disabled:text-slate-400",
  }[variant];
  return (
    <button
      type={type}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${styles}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 placeholder:text-slate-400";

export function Card({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {actions}
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-500">
      {children}
    </p>
  );
}

export function Tag({ tone, children }: { tone: "ok" | "warn" | "bad" | "info"; children: ReactNode }) {
  const styles = {
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-amber-100 text-amber-800",
    bad: "bg-rose-100 text-rose-800",
    info: "bg-sky-100 text-sky-800",
  }[tone];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${styles}`}>{children}</span>
  );
}

export function StatusTag({ status }: { status: string }) {
  const tone =
    status === "paid" || status === "received" || status === "resolved" || status === "checked_in"
      ? "ok"
      : status === "disputed" || status === "flagged_duplicate" || status === "canceled"
        ? "bad"
        : status === "authorized" || status === "approved" || status === "scheduled" || status === "matched"
          ? "info"
          : "warn";
  return <Tag tone={tone as "ok" | "warn" | "bad" | "info"}>{status.replace(/_/g, " ")}</Tag>;
}
