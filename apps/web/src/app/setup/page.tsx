import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth";
import { SetupForm } from "@/components/setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/sign-in");

  return (
    <main className="max-w-lg mx-auto mt-16 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-[color:var(--accent)]">◆</span> Setup inicial
        </h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">
          Crea la cuenta dueña del dashboard. Las preguntas de seguridad se usan
          para recuperar la contraseña sin enviar email.
        </p>
      </header>
      <SetupForm />
    </main>
  );
}
