"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const PRESETS = [
  { label: "1 h", hours: 1 },
  { label: "3 h", hours: 3 },
  { label: "6 h", hours: 6 },
  { label: "12 h", hours: 12 },
  { label: "24 h", hours: 24 },
  { label: "48 h", hours: 48 },
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
    <div className="rounded-lg border border-white/10 p-4 space-y-3 bg-white/[0.015]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-[color:var(--muted)]">Duración:</span>
        {PRESETS.map((p) => (
          <Button
            key={p.hours}
            size="sm"
            variant={hours === p.hours ? "default" : "outline"}
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
          className="w-20 rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-right font-mono"
        />
        <span className="text-xs text-[color:var(--muted)]">h</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Etiqueta (opcional) — ej. 'Test universo dinámico'"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={disabled || busy}
          maxLength={120}
          className="flex-1 min-w-[240px] rounded bg-white/5 border border-white/10 px-2 py-1 text-sm"
        />
        <Button onClick={start} disabled={disabled || busy}>
          {busy ? "Iniciando…" : disabled ? "Ya hay un run activo" : "Iniciar corrida"}
        </Button>
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
