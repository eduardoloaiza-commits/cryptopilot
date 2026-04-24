"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface Question {
  position: number;
  question: string;
}

export function AccountForms({
  initialQuestions,
}: {
  initialQuestions: Question[];
}) {
  return (
    <div className="space-y-8">
      <ChangePasswordForm />
      <ChangeQuestionsForm initial={initialQuestions} />
    </div>
  );
}

function ChangePasswordForm() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (nw !== confirm) return setMsg({ kind: "err", text: "las contraseñas no coinciden" });
    if (nw.length < 8) return setMsg({ kind: "err", text: "mínimo 8 caracteres" });
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: cur, newPassword: nw }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "error");
      }
      setMsg({ kind: "ok", text: "contraseña actualizada" });
      setCur("");
      setNw("");
      setConfirm("");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 p-5">
      <h2 className="text-sm font-medium">Cambiar contraseña</h2>
      <Field label="Contraseña actual" type="password" value={cur} onChange={setCur} autoComplete="current-password" />
      <Field label="Nueva contraseña (mín 8)" type="password" value={nw} onChange={setNw} autoComplete="new-password" />
      <Field label="Repite nueva contraseña" type="password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Actualizar contraseña"}
        </Button>
        {msg && (
          <span className={msg.kind === "ok" ? "text-xs text-[color:var(--accent)]" : "text-xs text-destructive"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function ChangeQuestionsForm({ initial }: { initial: Question[] }) {
  const [current, setCurrent] = useState("");
  const [questions, setQuestions] = useState(
    initial.length === 3
      ? initial.map((q) => ({ question: q.question, answer: "" }))
      : [
          { question: "", answer: "" },
          { question: "", answer: "" },
          { question: "", answer: "" },
        ],
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function setQ(i: number, patch: Partial<{ question: string; answer: string }>) {
    setQuestions((arr) => arr.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (questions.some((q) => q.question.trim().length < 8 || q.answer.trim().length < 2)) {
      return setMsg({ kind: "err", text: "completa las 3 preguntas y respuestas" });
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, questions }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "error");
      }
      setMsg({ kind: "ok", text: "preguntas actualizadas" });
      setCurrent("");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-white/10 p-5">
      <div>
        <h2 className="text-sm font-medium">Preguntas de seguridad</h2>
        <p className="text-xs text-[color:var(--muted)] mt-1">
          Reemplazas las 3 preguntas y respuestas. Requiere tu contraseña actual.
        </p>
      </div>
      <Field
        label="Contraseña actual"
        type="password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
      />
      {questions.map((q, i) => (
        <div key={i} className="pt-2 border-t border-white/5 space-y-2">
          <div className="text-xs text-[color:var(--muted)]">Pregunta {i + 1}</div>
          <input
            type="text"
            value={q.question}
            onChange={(e) => setQ(i, { question: e.target.value })}
            placeholder="Pregunta"
            className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={q.answer}
            onChange={(e) => setQ(i, { answer: e.target.value })}
            placeholder="Respuesta nueva"
            className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? "Guardando…" : "Actualizar preguntas"}
        </Button>
        {msg && (
          <span className={msg.kind === "ok" ? "text-xs text-[color:var(--accent)]" : "text-xs text-destructive"}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-[color:var(--muted)]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        autoComplete={autoComplete}
        className="mt-1 w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm focus:outline-none focus:border-[hsl(var(--sh-primary))]"
      />
    </label>
  );
}
