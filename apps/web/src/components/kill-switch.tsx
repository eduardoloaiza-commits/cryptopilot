"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
        <Button
          size="sm"
          variant={paused ? "primary" : "warn"}
          onClick={doPause}
          disabled={busy !== null || killActive}
          title={killActive ? "Kill-switch activo — usa el botón rojo" : undefined}
        >
          {busy === "pause" ? "…" : paused ? "Resume" : "Pausar"}
        </Button>
        <Button
          size="sm"
          variant={killActive ? "primary" : "destructive"}
          onClick={doKill}
          disabled={busy !== null}
        >
          {busy === "kill" ? "…" : killActive ? "Revive" : "Kill-Switch"}
        </Button>
      </div>
      {killActive && killReason && (
        <p className="label-caps text-error max-w-[280px] text-right">KILL: {killReason}</p>
      )}
      {!killActive && paused && pausedReason && (
        <p className="label-caps text-tertiary max-w-[280px] text-right">PAUSED: {pausedReason}</p>
      )}
      {error && <p className="label-caps text-error">{error}</p>}
    </div>
  );
}

export const KillSwitchButton = WorkerControls;
