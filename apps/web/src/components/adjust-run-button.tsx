"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PRESETS = [1, 2, 3, 4, 6, 8, 12, 24, 48];

export function AdjustRunButton({ runId, currentTotalHours }: { runId: string; currentTotalHours: number }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState<number>(Math.round(currentTotalHours * 10) / 10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/runs/${runId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ totalHours: hours }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "error");
      }
      startTransition(() => router.refresh());
      setOpen(false);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Adjust
      </Button>
    );
  }

  return (
    <div className="bg-surface-container-low border border-white/10 p-3 space-y-3 inline-block">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="label-caps text-outline">TOTAL HOURS</span>
        {PRESETS.map((h) => (
          <Button
            key={h}
            size="sm"
            variant={hours === h ? "primary" : "outline"}
            onClick={() => setHours(h)}
            disabled={busy}
          >
            {h}H
          </Button>
        ))}
        <input
          type="number"
          step={0.25}
          min={0.25}
          max={168}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          disabled={busy}
          className="w-20 bg-transparent border-0 border-b border-white/10 px-2 py-1 data-tabular text-right text-on-surface focus:outline-none focus:border-primary/40"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Save"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
          Cancel
        </Button>
        {err && <span className="label-caps text-error">{err}</span>}
      </div>
      <p className="label-caps text-outline">
        TIP · la duración total se mide desde el INICIO, no desde ahora
      </p>
    </div>
  );
}
