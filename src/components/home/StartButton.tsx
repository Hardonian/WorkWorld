"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../workspace/ui.tsx";

export default function StartButton({ scenarioId, label }: { scenarioId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      ariaLabel={`Start episode ${scenarioId}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/episodes", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ scenarioId, condition: "human" }),
          });
          if (res.ok) {
            router.push("/workspace");
          } else {
            setBusy(false);
          }
        } catch {
          setBusy(false);
        }
      }}
    >
      {busy ? "Starting…" : label ?? "Start episode"}
    </Button>
  );
}
