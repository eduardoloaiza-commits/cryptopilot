"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Question {
  position: number;
  question: string;
}

export function RecoverForm() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "answers">("email");
  const [email, setEmail] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchQuestions(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/recover/questions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("error obteniendo preguntas");
      const data = (await res.json()) as { questions: Question[] };
      setQuestions(data.questions);
      setStep("answers");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (newPassword !== confirm) throw new Error("las contraseñas no coinciden");
      if (newPassword.length < 8) throw new Error("password mínimo 8 caracteres");
      const payload = {
        email,
        newPassword,
        answers: questions.map((q) => ({
          position: q.position,
          answer: answers[q.position] ?? "",
        })),
      };
      const res = await fetch("/api/auth/recover/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "no se pudo resetear");
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <form onSubmit={fetchQuestions} className="space-y-4 rounded-lg border border-white/10 p-5">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Cargando…" : "Continuar"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="space-y-4 rounded-lg border border-white/10 p-5">
      <p className="text-xs text-[color:var(--muted)]">
        Responde las 3 preguntas exactamente como las configuraste (no importan mayúsculas
        ni espacios extra).
      </p>
      {questions.map((q) => (
        <label key={q.position} className="block">
          <span className="text-xs text-[color:var(--muted)]">{q.question}</span>
          <input
            type="text"
            value={answers[q.position] ?? ""}
            onChange={(e) => setAnswers({ ...answers, [q.position]: e.target.value })}
            required
            className="mt-1 w-full rounded bg-white/5 border border-white/10 px-3 py-2 text-sm"
          />
        </label>
      ))}
      <div className="pt-3 border-t border-white/5 space-y-3">
        <Field
          label="Nueva contraseña (mín 8)"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <Field
          label="Repite nueva contraseña"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
      </div>
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Verificando…" : "Resetear contraseña"}
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
