"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    <div className="flex items-center gap-2 text-xs">
      <Link
        href="/account"
        className="text-[color:var(--muted)] hover:text-[color:var(--fg)]"
        title={email}
      >
        {email}
      </Link>
      <Button size="sm" variant="ghost" onClick={signOut} disabled={busy}>
        {busy ? "…" : "Salir"}
      </Button>
    </div>
  );
}
