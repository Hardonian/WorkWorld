import Link from "next/link";
import type { Metadata } from "next";
import { RoiModeler } from "../../components/index/RoiModeler.tsx";

export const metadata: Metadata = { title: "ROI model · WorkWorld Index", description: "A transparent planning model for agent workflow economics." };

export default function RoiPage() {
  return <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:py-16"><div className="mx-auto max-w-6xl"><Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">← WorkWorld Index</Link><div className="mt-8"><RoiModeler /></div></div></main>;
}
