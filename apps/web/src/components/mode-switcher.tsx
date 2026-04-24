"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Mode = "PAPER" | "TESTNET" | "LIVE";

const MODES: { id: Mode; label: string; tone: "muted" | "warn" | "destructive"; help: string }[] = [
  { id: "PAPER", label: "PAPER", tone: "muted", help: "Fills simulados, sin tocar Binance." },
  { id: "TESTNET", label: "TESTNET", tone: "warn", help: "Órdenes reales en testnet.binance.vision (saldos ficticios)." },
  { id: "LIVE", label: "LIVE", tone: "destructive", help: "Producción. Dinero real. Confirmar dos veces." },
];

const TONE_BORDER: Record<string, string> = {
  muted: "border-white/10 text-outline",
  warn: "border-tertiary/40 text-tertiary",
  destructive: "border-error/40 text-error",
};

const TONE_FILL: Record<string, string> = {
  muted: "bg-white/5 border-white/20 text-outline",
  warn: "bg-tertiary/10 border-tertiary text-tertiary",
  destructive: "bg-error/10 border-error text-error",
};

export function ModeSwitcher({ current }: { current: Mode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cur = MODES.find((m) => m.id === current) ?? MODES[0]!;

  async function pick(target: Mode) {
    if (target === current) {
      setOpen(false);
      return;
    }
    const meta = MODES.find((m) => m.id === target)!;
    let confirmMsg = `Cambiar de ${current} a ${target}?\n\n${meta.help}\n\nEl worker leerá el nuevo modo en su próximo ciclo (≤3 min).`;
    if (target === "LIVE") {
      confirmMsg = `⚠️ MODO LIVE\n\nEsto hará operaciones con dinero real en Binance producción. Asegúrate de:\n· tener API keys de producción configuradas\n· haber validado ≥48h en TESTNET\n· tener guardrails revisados\n\n¿Continuar?`;
      if (!confirm(confirmMsg)) return;
      const phrase = prompt('Escribe exactamente "LIVE" para confirmar:');
      if (phrase !== "LIVE") return;
    } else {
      if (!confirm(confirmMsg)) return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: target }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "error");
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] border ${TONE_FILL[cur.tone]} flex items-center gap-1 hover:opacity-80`}
        title="Cambiar modo de operación"
      >
        {cur.label}
        <span className="material-symbols-outlined text-[12px] leading-none">
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-surface-container-low border border-white/10 w-72">
            <div className="px-3 py-2 border-b border-white/10 label-caps text-outline">
              MODO DE OPERACIÓN
            </div>
            <ul>
              {MODES.map((m) => (
                <li key={m.id}>
                  <button
                    onClick={() => pick(m.id)}
                    disabled={busy}
                    className={`w-full text-left px-3 py-3 hover:bg-white/5 transition-colors flex items-center justify-between gap-3 ${m.id === current ? "bg-white/[0.02]" : ""}`}
                  >
                    <div>
                      <div className={`label-caps ${m.id === current ? TONE_FILL[m.tone].split(" ").pop() : "text-on-surface"}`}>
                        {m.label}
                        {m.id === current && <span className="ml-2 text-outline">· ACTUAL</span>}
                      </div>
                      <div className="text-[11px] text-outline mt-0.5">{m.help}</div>
                    </div>
                    {m.id !== current && (
                      <span className={`px-1 text-[9px] border ${TONE_BORDER[m.tone]}`}>
                        SWITCH
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            {err && <p className="px-3 py-2 label-caps text-error border-t border-white/10">{err}</p>}
            <div className="px-3 py-2 border-t border-white/10 text-[11px] text-outline">
              El worker lee el modo en cada ciclo (≤3 min de delay).
            </div>
          </div>
        </>
      )}
    </div>
  );
}
