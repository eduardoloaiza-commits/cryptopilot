"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  killActive: boolean;
  killReason: string | null;
  paused: boolean;
  pausedReason: string | null;
}

export function WorkerControls({ killActive, killReason, paused, pausedReason }: Props) {
  const [busy, setBusy] = useState<null | "kill" | "pause">(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function doKill() {
    if (killActive) {
      if (!confirm("¿Reactivar el bot? El kill-switch se levantará.")) return;
      return run("kill", "/api/agent/revive", null);
    }
    const r = prompt("Razón para activar kill-switch:");
    if (!r || r.length < 3) return;
    run("kill", "/api/agent/kill", { reason: r });
  }

  async function doPause() {
    if (paused) {
      if (!confirm("¿Reanudar el worker?")) return;
      return run("pause", "/api/agent/resume", null);
    }
    const r = prompt("Razón para pausar (mín 3 caracteres):");
    if (!r || r.length < 3) return;
    run("pause", "/api/agent/pause", { reason: r });
  }

  async function run(
    scope: "kill" | "pause",
    url: string,
    body: Record<string, unknown> | null,
  ) {
    setBusy(scope);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <button
          onClick={doPause}
          disabled={busy !== null || killActive}
          className={
            paused
              ? "rounded px-3 py-2 text-sm font-medium bg-yellow-400 text-black hover:opacity-90 disabled:opacity-40"
              : "rounded px-3 py-2 text-sm font-medium border border-yellow-400/60 text-yellow-300 hover:bg-yellow-400/10 disabled:opacity-40"
          }
          title={killActive ? "Kill-switch activo — usa el botón rojo" : undefined}
        >
          {busy === "pause" ? "…" : paused ? "Reanudar" : "Pausar"}
        </button>
        <button
          onClick={doKill}
          disabled={busy !== null}
          className={
            killActive
              ? "rounded px-3 py-2 text-sm font-medium bg-[color:var(--accent)] text-black hover:opacity-90 disabled:opacity-50"
              : "rounded px-3 py-2 text-sm font-medium bg-[color:var(--danger)] text-white hover:opacity-90 disabled:opacity-50"
          }
        >
          {busy === "kill" ? "…" : killActive ? "Reactivar" : "Kill-switch"}
        </button>
      </div>
      {killActive && killReason && (
        <p className="text-xs text-[color:var(--danger)] max-w-[280px] text-right">
          Kill: {killReason}
        </p>
      )}
      {!killActive && paused && pausedReason && (
        <p className="text-xs text-yellow-300 max-w-[280px] text-right">
          Pausado: {pausedReason}
        </p>
      )}
      {error && <p className="text-xs text-[color:var(--danger)]">{error}</p>}
    </div>
  );
}

/** @deprecated use WorkerControls */
export const KillSwitchButton = WorkerControls;
