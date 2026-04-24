"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/sign-in");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/account"
        className="label-caps text-outline hover:text-on-surface transition-colors hidden sm:block"
        title={email}
      >
        {email}
      </Link>
      <button
        onClick={signOut}
        disabled={busy}
        className="label-caps text-outline hover:text-error transition-colors"
      >
        {busy ? "…" : "Salir"}
      </button>
    </div>
  );
}
