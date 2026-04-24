"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { TerminalField } from "@/components/terminal-field";

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
    <div className="space-y-6">
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
      setMsg({ kind: "ok", text: "PASSWORD ACTUALIZADA" });
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
    <form onSubmit={submit} className="bg-surface border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="label-caps text-on-surface">CHANGE PASSWORD</h3>
      </div>
      <div className="p-5 space-y-4">
        <TerminalField
          label="Current password"
          type="password"
          value={cur}
          onChange={setCur}
          autoComplete="current-password"
        />
        <TerminalField
          label="New password (min 8)"
          type="password"
          value={nw}
          onChange={setNw}
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
      <div className="flex items-center gap-3 p-4 border-t border-white/10">
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update password"}
        </Button>
        {msg && (
          <span className={`label-caps ${msg.kind === "ok" ? "text-primary" : "text-error"}`}>
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
      setMsg({ kind: "ok", text: "PREGUNTAS ACTUALIZADAS" });
      setCurrent("");
    } catch (e) {
      setMsg({ kind: "err", text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-surface border border-white/10">
      <div className="p-4 border-b border-white/10">
        <h3 className="label-caps text-on-surface">SECURITY QUESTIONS</h3>
        <p className="text-[11px] text-outline mt-1">
          Reemplazas las 3 preguntas y respuestas. Requiere tu contraseña actual.
        </p>
      </div>
      <div className="p-5 space-y-4">
        <TerminalField
          label="Current password"
          type="password"
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
        />
        {questions.map((q, i) => (
          <div key={i} className="pt-3 border-t border-white/5 space-y-2">
            <span className="label-caps text-outline">
              QUESTION {String(i + 1).padStart(2, "0")}
            </span>
            <TerminalField
              label=""
              type="text"
              value={q.question}
              onChange={(v) => setQ(i, { question: v })}
              placeholder="Pregunta"
            />
            <TerminalField
              label="Answer"
              type="text"
              value={q.answer}
              onChange={(v) => setQ(i, { answer: v })}
              placeholder="Nueva respuesta"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 p-4 border-t border-white/10">
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Update questions"}
        </Button>
        {msg && (
          <span className={`label-caps ${msg.kind === "ok" ? "text-primary" : "text-error"}`}>
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}
