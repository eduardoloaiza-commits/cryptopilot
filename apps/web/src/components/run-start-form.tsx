"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { label: "1H", hours: 1 },
  { label: "3H", hours: 3 },
  { label: "6H", hours: 6 },
  { label: "12H", hours: 12 },
  { label: "24H", hours: 24 },
  { label: "48H", hours: 48 },
];

export function RunStartForm({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [hours, setHours] = useState<number>(12);
  const [label, setLabel] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ durationHours: hours, label: label.trim() || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "error" }));
        throw new Error(JSON.stringify(body));
      }
      startTransition(() => router.refresh());
      setLabel("");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-white/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="label-caps text-on-surface">NUEVA CORRIDA</h3>
        {disabled && (
          <span className="label-caps text-tertiary">RUN ACTIVO — ESPERA O CANCELA</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="label-caps text-outline mr-1">DURATION</span>
        {PRESETS.map((p) => (
          <Button
            key={p.hours}
            size="sm"
            variant={hours === p.hours ? "primary" : "outline"}
            onClick={() => setHours(p.hours)}
            disabled={disabled || busy}
          >
            {p.label}
          </Button>
        ))}
        <input
          type="number"
          step={0.25}
          min={0.25}
          max={168}
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          disabled={disabled || busy}
          className="w-20 bg-transparent border-0 border-b border-white/10 px-2 py-1 data-tabular text-right text-on-surface focus:outline-none focus:border-primary/40"
        />
        <span className="label-caps text-outline">HOURS</span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Label (optional) — e.g. 'Dynamic universe baseline'"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={disabled || busy}
          maxLength={120}
          className="flex-1 min-w-[240px] bg-transparent border-0 border-b border-white/10 px-2 py-2 data-tabular text-on-surface placeholder:text-surface-bright focus:outline-none focus:border-primary/40"
        />
        <Button variant="primary" onClick={start} disabled={disabled || busy}>
          {busy ? "Iniciando…" : "Iniciar Run"}
        </Button>
      </div>

      {err && <p className="label-caps text-error">{err}</p>}
    </div>
  );
}
