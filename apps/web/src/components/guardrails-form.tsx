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
      setMsg({ kind: "ok", text: "GUARDRAILS ACTUALIZADOS" });
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="label-caps text-on-surface">RISK CONTROLS</h3>
      </div>
      <div className="p-5 space-y-5">
        <Row
          label="MAX PER TRADE"
          hint="notional máximo por entrada = equity × este valor"
          suffix="%"
          value={form.maxPerTradePct * 100}
          onChange={(v) => setForm({ ...form, maxPerTradePct: Number(v) / 100 })}
          min={0.1}
          max={20}
          step={0.1}
        />
        <Row
          label="STOP-LOSS"
          hint="distancia del SL desde la entrada"
          suffix="%"
          value={form.stopLossPct * 100}
          onChange={(v) => setForm({ ...form, stopLossPct: Number(v) / 100 })}
          min={0.05}
          max={10}
          step={0.05}
        />
        <Row
          label="TAKE-PROFIT"
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
          label="DAILY LOSS LIMIT"
          hint="al tocarlo → kill-switch automático"
          suffix="%"
          value={form.dailyLossLimitPct * 100}
          onChange={(v) => setForm({ ...form, dailyLossLimitPct: Number(v) / 100 })}
          min={0.5}
          max={20}
          step={0.5}
        />
        <Row
          label="MAX OPEN POSITIONS"
          value={form.maxOpenPositions}
          onChange={(v) => setForm({ ...form, maxOpenPositions: Number(v) })}
          min={1}
          max={10}
          step={1}
        />
      </div>
      <div className="flex items-center gap-3 p-4 border-t border-white/10">
        <Button variant="primary" disabled={!dirty || busy} onClick={submit}>
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button
          variant="outline"
          disabled={!dirty || busy}
          onClick={() => setForm(initial)}
        >
          Discard
        </Button>
        {msg && (
          <span
            className={`label-caps ${msg.kind === "ok" ? "text-primary" : "text-error"}`}
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
      <div className="flex-1 min-w-[240px]">
        <div className="label-caps text-on-surface">{label}</div>
        {hint && <div className="text-[11px] text-outline mt-1">{hint}</div>}
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
          className="w-28 bg-transparent border-0 border-b border-white/10 px-2 py-1 data-tabular text-right text-on-surface focus:outline-none focus:border-primary/40"
        />
        {suffix && <span className="label-caps text-outline">{suffix}</span>}
      </div>
    </label>
  );
}
