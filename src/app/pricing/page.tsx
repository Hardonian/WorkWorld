"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "../../components/ui/ThemeProvider.tsx";

const PLANS = [
  {
    tier: "community",
    name: "Community Sandbox",
    pricePerSeat: 0,
    badge: "Free Exploration",
    description: "For individual learners exploring operational fundamentals and routine scenarios.",
    features: [
      "Access to Core A1–C2 Scenarios",
      "Full Double-Entry Ledger Engine",
      "Interactive Spreadsheet & Safe Formulas",
      "Deterministic Grader & Instant Feedback",
      "Local Session Persistence",
    ],
    cta: "Start Sandbox",
    popular: false,
  },
  {
    tier: "academic",
    name: "University & Department",
    pricePerSeat: 49,
    badge: "Most Popular",
    description: "For operations instructors, university cohorts, and certification programs.",
    features: [
      "All 15 Routine & Enterprise Scenarios",
      "LTI 1.3 Advantage (Canvas, Blackboard Sync)",
      "Live Cohort Proctoring & Interventions",
      "Double-Blind Assessor Workspace",
      "Downloadable Assessment PDF Reports",
      "Verifiable Apprenticeship Badges",
      "Up to 150 Student Seats",
    ],
    cta: "Deploy Cohort",
    popular: true,
  },
  {
    tier: "enterprise",
    name: "Enterprise Apprenticeship & AI Labs",
    pricePerSeat: 199,
    badge: "Full Power",
    description: "For corporate supply chains, AI benchmark labs, and high-volume recruiting.",
    features: [
      "Custom Digital Twin Scenario Forge",
      "Dedicated PostgreSQL RLS Tenant Isolation",
      "Frontier Model Arena & Multi-Agent Teams",
      "Greenhouse, Lever & Workday ATS Webhooks",
      "SOC2 Type II Audit Compliance Exports",
      "Automated Parquet/CSV Data Lake Pipeline",
      "Up to 1,000+ Scalable Seats",
    ],
    cta: "Contact Enterprise",
    popular: false,
  },
];

export default function PricingPage() {
  const [selectedSeats, setSelectedSeats] = useState(25);
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: string) => {
    if (tier === "community") {
      window.location.href = "/workspace";
      return;
    }

    setLoadingTier(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: `org_${Math.random().toString(36).slice(2, 8)}`,
          tier,
          seatCount: selectedSeats,
          successUrl: `${window.location.origin}/workspace?upgrade=success`,
          cancelUrl: `${window.location.origin}/pricing`,
        }),
      });

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      console.error("Checkout initiation failed:", err);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-sm">
              W
            </span>
            <span>WorkWorld</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-400 font-medium">
              Commercial Plans
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/workspace" className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
              Workspace
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
              Leaderboard
            </Link>
            <Link href="/docs" className="text-sm font-medium hover:text-indigo-600 dark:hover:text-indigo-400">
              Docs
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-12 space-y-12">
        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Transparent Pricing for Apprenticeships & AI Benchmarking
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            From single-operator sandboxes to university departments and global enterprise operations centers.
          </p>

          {/* Seat Scaler Slider */}
          <div className="pt-6 pb-2 inline-flex flex-col items-center gap-2 p-4 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cohort Seats:</span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{selectedSeats} seats</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={selectedSeats}
              onChange={(e) => setSelectedSeats(Number(e.target.value))}
              className="w-64 accent-indigo-600 cursor-pointer"
            />
            <span className="text-[11px] text-slate-400">Drag to preview monthly pricing across tiers</span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const monthlyTotal = plan.pricePerSeat * selectedSeats;

            return (
              <div
                key={plan.tier}
                className={`relative flex flex-col justify-between rounded-2xl border p-8 shadow-sm transition-all hover:shadow-xl ${
                  plan.popular
                    ? "border-indigo-600 bg-white ring-2 ring-indigo-600/20 dark:border-indigo-500 dark:bg-slate-900"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-6">
                  <div>
                    <h2 className="text-xl font-bold">{plan.name}</h2>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{plan.description}</p>
                  </div>

                  <div className="border-t border-b border-slate-100 py-4 dark:border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight">
                        ${plan.pricePerSeat === 0 ? "0" : monthlyTotal.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        {plan.pricePerSeat === 0 ? "forever" : "/ month"}
                      </span>
                    </div>
                    {plan.pricePerSeat > 0 && (
                      <p className="mt-1 text-xs text-slate-400">
                        ${plan.pricePerSeat} per seat × {selectedSeats} seats
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Included Capabilities:</p>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="text-emerald-500 font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    onClick={() => handleCheckout(plan.tier)}
                    disabled={loadingTier === plan.tier}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition-all ${
                      plan.popular
                        ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                        : "border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {loadingTier === plan.tier ? "Preparing Checkout..." : plan.cta}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security & Compliance Highlights */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100/60 p-8 dark:border-slate-800 dark:bg-slate-900/60 space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h3 className="text-base font-bold">Enterprise Compliance & Infrastructure Guarantees</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Engineered for strict organizational security policies and academic FERPA/GDPR compliance.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 text-xs text-slate-600 dark:text-slate-300 pt-2">
            <div>
              <strong>Tenant Isolation:</strong> Dedicated PostgreSQL Row-Level Security (RLS) policies isolating runs, actions, and evidence across org boundaries.
            </div>
            <div>
              <strong>Audit Trail:</strong> SHA-256 hash-chained security event log recording administrative changes, login sessions, and sign-offs.
            </div>
            <div>
              <strong>Edge Reliability:</strong> Cloudflare edge proxy architecture providing DDoS defense, global CDN caching, and 99.95% uptime SLA.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
