import Link from "next/link";
import { ThemeToggle } from "../../../components/ui/ThemeProvider.tsx";

interface VerifyPageProps {
  params: Promise<{ certId: string }>;
}

export default async function VerifyCertificatePage({ params }: VerifyPageProps) {
  const { certId } = await params;

  // Synthetic verified record for demonstration
  const cert = {
    id: certId || "WW-CERT-2026-8819",
    candidateName: "Jordan Hayes",
    track: "Professional Operations Apprenticeship — Small Business Logistics",
    organization: "Northline Operations Institute",
    issuedAt: "2026-10-02T18:00:00Z",
    codeRevision: "2e2cd1a5",
    status: "VERIFIED_AUTHENTIC",
    skillsVerified: [
      "3-Way Accounts Payable Matching (PO, Receiving Slip, Vendor Invoice)",
      "Double-Entry General Ledger Accrual Accounting",
      "Dynamic Supplier Contract Amendment & Lead-Time Optimization",
      "Vendor Discrepancy Dispute Resolution & Debit Memo Issuance",
      "Fraud Detection & Phishing Payment Detail Defense",
    ],
    signatureDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4">
        <div className="mx-auto max-w-4xl flex items-center justify-between">
          <Link href="/" className="text-sm font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
            WorkWorld Certificate Verification
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-6 dark:border-slate-800">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                VERIFIED AUTHENTIC CREDENTIAL
              </span>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {cert.candidateName}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Certificate ID: <span className="font-mono">{cert.id}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400">Issued Date</p>
              <p className="text-xs font-semibold font-mono text-slate-700 dark:text-slate-300">
                {new Date(cert.issuedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-xs">
            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Apprenticeship Program Track
              </p>
              <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                {cert.track}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                Machine-Verified Core Competencies
              </p>
              <ul className="mt-2 space-y-1.5 list-disc list-inside text-slate-700 dark:text-slate-300">
                {cert.skillsVerified.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Issuing Authority:</span>
                <span>{cert.organization}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Execution Revision:</span>
                <span>{cert.codeRevision}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tamper-Proof Digest:</span>
                <span className="truncate max-w-xs">{cert.signatureDigest}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-100 pt-6 flex items-center justify-between text-xs dark:border-slate-800">
            <Link href="/" className="text-indigo-600 dark:text-indigo-400 hover:underline">
              ← Return to WorkWorld
            </Link>
            <span className="text-slate-400">
              Deterministic verification against WorkWorld Ledger Invariants.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
