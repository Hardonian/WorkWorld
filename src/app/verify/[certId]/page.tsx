import Link from "next/link";

export default async function VerifyPage({ params }: { params: Promise<{ certId: string }> }) {
  const { certId } = await params;
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Credential unavailable</p>
      <h1 className="mt-2 text-3xl font-extrabold">WorkWorld does not issue credentials</h1>
      <p className="mt-4 text-slate-600 dark:text-slate-400">No authentic certificate exists for <span className="font-mono">{certId}</span>. Current reports are narrow simulation evidence only; they do not verify skill, employability, accreditation, or hiring suitability.</p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-700 hover:underline dark:text-indigo-300">Return to WorkWorld</Link>
    </main>
  );
}
