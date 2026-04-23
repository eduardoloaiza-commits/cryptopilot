"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  active: boolean;
  reason: string | null;
}

export function KillSwitchButton({ active, reason }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function trigger() {
    if (active) {
      if (!confirm("¿Reactivar el bot? El kill-switch se levantará.")) return;
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/agent/revive", { method: "POST" });
        if (!res.ok) throw new Error(await res.text());
        startTransition(() => router.refresh());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
      return;
    }

    const r = prompt("Razón para activar kill-switch:");
    if (!r || r.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/agent/kill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: r }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={trigger}
        disabled={busy}
        className={
          active
            ? "rounded px-4 py-2 text-sm font-medium bg-[color:var(--accent)] text-black hover:opacity-90 disabled:opacity-50"
            : "rounded px-4 py-2 text-sm font-medium bg-[color:var(--danger)] text-white hover:opacity-90 disabled:opacity-50"
        }
      >
        {busy ? "…" : active ? "Reactivar bot" : "Kill-switch"}
      </button>
      {active && reason && (
        <p className="text-xs text-[color:var(--danger)] mt-1 max-w-[260px]">
          Detenido: {reason}
        </p>
      )}
      {error && <p className="text-xs text-[color:var(--danger)] mt-1">{error}</p>}
    </div>
  );
}
