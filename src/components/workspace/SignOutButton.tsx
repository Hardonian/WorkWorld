"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <div className="flex items-center justify-end gap-3 px-6 py-3 text-sm">
    {message && <span role="alert">{message}</span>}
    <button disabled={busy} className="rounded-lg border border-slate-300 px-3 py-1.5 disabled:opacity-50" onClick={async () => {
      setBusy(true); setMessage(null);
      try { const response = await fetch("/api/auth/session", { method: "DELETE" });
        if (!response.ok) { setMessage("Could not sign out. Please try again."); return; }
        router.replace("/login"); router.refresh();
      } catch { setMessage("Could not reach the service."); }
      finally { setBusy(false); }
    }}>{busy ? "Signing out…" : "Sign out"}</button>
  </div>;
}
