"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Initial {
  maxPerTradePct: number;
  stopLossPct: number;
  takeProfitPct: number | null;
  dailyLossLimitPct: number;
  maxOpenPositions: number;
}

export function GuardrailsForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [form, setForm] = useState(initial);

  const dirty =
    form.maxPerTradePct !== initial.maxPerTradePct ||
    form.stopLossPct !== initial.stopLossPct ||
    form.takeProfitPct !== initial.takeProfitPct ||
    form.dailyLossLimitPct !== initial.dailyLossLimitPct ||
    form.maxOpenPositions !== initial.maxOpenPositions;

  async function submit() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/guardrails", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg({ kind: "ok", text: "Guardrails actualizados" });
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-white/10 p-5">
      <Row
        label="Max por trade (%)"
        hint="notional máximo por entrada = equity × este valor"
        suffix="%"
        value={form.maxPerTradePct * 100}
        onChange={(v) => setForm({ ...form, maxPerTradePct: Number(v) / 100 })}
        min={0.1}
        max={20}
        step={0.1}
      />
      <Row
        label="Stop-loss (%)"
        hint="distancia del SL desde la entrada"
        suffix="%"
        value={form.stopLossPct * 100}
        onChange={(v) => setForm({ ...form, stopLossPct: Number(v) / 100 })}
        min={0.05}
        max={10}
        step={0.05}
      />
      <Row
        label="Take-profit (%)"
        hint="opcional — dejar vacío para que lo decida el trader"
        suffix="%"
        value={form.takeProfitPct == null ? "" : form.takeProfitPct * 100}
        onChange={(v) =>
          setForm({ ...form, takeProfitPct: v === "" ? null : Number(v) / 100 })
        }
        min={0.1}
        max={50}
        step={0.1}
        allowEmpty
      />
      <Row
        label="Pérdida diaria máxima (%)"
        hint="al tocarlo → kill-switch automático"
        suffix="%"
        value={form.dailyLossLimitPct * 100}
        onChange={(v) => setForm({ ...form, dailyLossLimitPct: Number(v) / 100 })}
        min={0.5}
        max={20}
        step={0.5}
      />
      <Row
        label="Máx. posiciones simultáneas"
        value={form.maxOpenPositions}
        onChange={(v) => setForm({ ...form, maxOpenPositions: Number(v) })}
        min={1}
        max={10}
        step={1}
      />

      <div className="flex items-center gap-3 pt-2 border-t border-white/5">
        <Button disabled={!dirty || busy} onClick={submit}>
          {busy ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => setForm(initial)}
        >
          Descartar
        </Button>
        {msg && (
          <span
            className={
              "text-xs " +
              (msg.kind === "ok" ? "text-[color:var(--accent)]" : "text-[color:var(--danger)]")
            }
          >
            {msg.text}
          </span>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  hint,
  suffix,
  value,
  onChange,
  min,
  max,
  step,
  allowEmpty,
}: {
  label: string;
  hint?: string;
  suffix?: string;
  value: number | string;
  onChange: (v: number | string) => void;
  min?: number;
  max?: number;
  step?: number;
  allowEmpty?: boolean;
}) {
  return (
    <label className="flex items-start gap-4 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-[color:var(--muted)]">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => {
            const raw = e.target.value;
            if (allowEmpty && raw === "") return onChange("");
            onChange(Number(raw));
          }}
          className="w-28 rounded bg-white/5 border border-white/10 px-2 py-1 text-sm text-right font-mono"
        />
        {suffix && <span className="text-xs text-[color:var(--muted)]">{suffix}</span>}
      </div>
    </label>
  );
}
