"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../workspace/ui.tsx";

export default function StartButton({ scenarioId, label }: { scenarioId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        ariaLabel={`Start episode ${scenarioId}`}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            const res = await fetch("/api/episodes", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ scenarioId, condition: "human" }),
            });
            if (res.ok) {
              router.push("/workspace");
              return;
            }
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? "Could not start this episode.");
          } catch {
            setError("Could not reach the WorkWorld service.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Starting…" : label ?? "Start episode"}
      </Button>
      {error ? <p role="alert" className="mt-2 max-w-xs text-xs text-rose-700 dark:text-rose-300">{error}</p> : null}
    </div>
  );
}
