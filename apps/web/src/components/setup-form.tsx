"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TerminalField } from "@/components/terminal-field";

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
    <form onSubmit={submit} className="space-y-8">
      <div className="space-y-6">
        <TerminalField
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="operator@cryptopilot.io"
          autoComplete="email"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TerminalField
            label="Password (min 8)"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <TerminalField
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="pt-6 border-t border-white/10 space-y-6">
        <div>
          <h2 className="headline-sm text-on-surface">Preguntas de seguridad</h2>
          <p className="label-caps text-tertiary mt-1">RECOVERY PROTOCOL · ALPHA</p>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="space-y-3 p-4 bg-white/[0.02] border-l border-white/10">
            <TerminalField
              label={`Security Question ${String(i + 1).padStart(2, "0")}`}
              type="text"
              list={`sug-${i}`}
              value={q.question}
              onChange={(v) => setQ(i, { question: v })}
              placeholder="¿Nombre de tu primera mascota?"
            />
            <datalist id={`sug-${i}`}>
              {SUGGESTED.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <TerminalField
              label="Answer"
              type="text"
              value={q.answer}
              onChange={(v) => setQ(i, { answer: v })}
            />
          </div>
        ))}
      </div>

      <div className="bg-tertiary/[0.08] border border-tertiary/20 p-4 flex gap-3 items-start">
        <span className="material-symbols-outlined text-tertiary text-[16px]">warning</span>
        <p className="text-[13px] text-tertiary">
          Memoriza las respuestas — si las pierdes, no podrás recuperar la cuenta.
        </p>
      </div>

      {err && <p className="label-caps text-error">{err}</p>}

      <Button type="submit" variant="default" disabled={busy} className="w-full py-4">
        {busy ? "Initializing…" : "Initialize Secure Access →"}
      </Button>
    </form>
  );
}
