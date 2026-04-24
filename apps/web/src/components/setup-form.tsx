"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const SUGGESTED = [
  "¿Nombre de tu primera mascota?",
  "¿Ciudad donde naciste?",
  "¿Apellido materno de tu padre?",
  "¿Calle de tu primera casa?",
  "¿Nombre de tu mejor amigo de infancia?",
  "¿Modelo del primer auto que tuviste?",
];

export function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [questions, setQuestions] = useState([
    { question: SUGGESTED[0]!, answer: "" },
    { question: SUGGESTED[1]!, answer: "" },
    { question: SUGGESTED[2]!, answer: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setQ(i: number, patch: Partial<{ question: string; answer: string }>) {
    setQuestions((arr) => arr.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) return setErr("las contraseñas no coinciden");
    if (password.length < 8) return setErr("password mínimo 8 caracteres");
    if (questions.some((q) => q.question.trim().length < 8 || q.answer.trim().length < 2)) {
      return setErr("cada pregunta y respuesta deben estar completas");
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, questions }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: unknown };
        throw new Error(typeof body.error === "string" ? body.error : "fallo al crear cuenta");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-white/10 p-5">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Contraseña (mín 8)"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="new-password"
      />
      <Field
        label="Repite contraseña"
        type="password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
      />

      <div className="pt-3 border-t border-white/5">
        <h2 className="text-sm font-medium mb-3">Preguntas de seguridad</h2>
        <p className="text-xs text-[color:var(--muted)] mb-3">
          Las respuestas se normalizan (sin mayúsculas, sin espacios extra). Memoriza
          ambas — si las pierdes, no podrás recuperar la cuenta.
        </p>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={i} className="space-y-2">
              <input
                type="text"
                list={`sug-${i}`}
                value={q.question}
                onChange={(e) => setQ(i, { question: e.target.value })}
                placeholder="Pregunta"
                className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
              />
              <datalist id={`sug-${i}`}>
                {SUGGESTED.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <input
                type="text"
                value={q.answer}
                onChange={(e) => setQ(i, { answer: e.target.value })}
                placeholder="Respuesta"
                className="w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Creando…" : "Crear cuenta"}
      </Button>
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
