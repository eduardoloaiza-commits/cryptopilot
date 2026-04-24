import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, userCount } from "@/lib/auth";
import { RecoverForm } from "@/components/recover-form";

export const dynamic = "force-dynamic";

export default async function RecoverPage() {
  if (await getSessionUser()) redirect("/");
  if ((await userCount()) === 0) redirect("/setup");

  return (
    <main className="max-w-sm mx-auto mt-16 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-[color:var(--accent)]">◆</span> Recuperar cuenta
        </h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Ingresa tu email, responde las 3 preguntas que configuraste y define
          una nueva contraseña.
        </p>
      </header>
      <RecoverForm />
      <p className="text-xs text-[color:var(--muted)] text-center">
        <Link href="/sign-in" className="underline hover:text-[color:var(--fg)]">
          ← Volver a login
        </Link>
      </p>
    </main>
  );
}
