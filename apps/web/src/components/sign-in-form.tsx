"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "credenciales inválidas");
      }
      router.push(next);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-white/10 p-5">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <Field
        label="Contraseña"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
      />
      {err && <p className="text-xs text-destructive">{err}</p>}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? "Ingresando…" : "Ingresar"}
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
