"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TerminalField } from "@/components/terminal-field";

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
      <form onSubmit={fetchQuestions} className="flex flex-col gap-5">
        <TerminalField
          label="Email Address"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="operator@cryptopilot.io"
          autoComplete="email"
        />
        {err && <p className="label-caps text-error">{err}</p>}
        <Button type="submit" variant="primary" disabled={busy} className="w-full">
          {busy ? "Cargando…" : "Continuar"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={reset} className="flex flex-col gap-5">
      <p className="label-caps text-outline">
        Responde las 3 preguntas (se normaliza: sin mayúsculas, sin espacios extra).
      </p>
      {questions.map((q, i) => (
        <div key={q.position} className="p-4 bg-white/[0.02] border-l border-white/10 space-y-2">
          <span className="label-caps text-outline">
            Question {String(i + 1).padStart(2, "0")}
          </span>
          <p className="text-[13px] text-on-surface">{q.question}</p>
          <TerminalField
            label="Answer"
            type="text"
            value={answers[q.position] ?? ""}
            onChange={(v) => setAnswers({ ...answers, [q.position]: v })}
          />
        </div>
      ))}
      <div className="pt-4 border-t border-white/5 space-y-4">
        <TerminalField
          label="New password (min 8)"
          type="password"
          value={newPassword}
          onChange={setNewPassword}
          autoComplete="new-password"
        />
        <TerminalField
          label="Confirm new password"
          type="password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
      </div>
      {err && <p className="label-caps text-error">{err}</p>}
      <Button type="submit" variant="primary" disabled={busy} className="w-full">
        {busy ? "Verificando…" : "Reset password"}
      </Button>
    </form>
  );
}
