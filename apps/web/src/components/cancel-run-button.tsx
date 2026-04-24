"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CancelRunButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (!confirm("¿Cancelar esta corrida? El reporte se generará con los datos que haya.")) return;
    setBusy(true);
    try {
      await fetch(`/api/runs/${runId}/cancel`, { method: "POST" });
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={cancel} disabled={busy}>
      {busy ? "…" : "Cancelar"}
    </Button>
  );
}
