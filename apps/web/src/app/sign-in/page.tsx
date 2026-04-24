import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, userCount } from "@/lib/auth";
import { SignInForm } from "@/components/sign-in-form";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const me = await getSessionUser();
  const sp = await searchParams;
  if (me) redirect(sp.next ?? "/");
  if ((await userCount()) === 0) redirect("/setup");

  return (
    <main className="max-w-sm mx-auto mt-20 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          <span className="text-[color:var(--accent)]">◆</span> CryptoPilot
        </h1>
        <p className="text-sm text-[color:var(--muted)] mt-1">Ingresa para continuar.</p>
      </header>
      <SignInForm next={sp.next ?? "/"} />
      <p className="text-xs text-[color:var(--muted)] text-center">
        ¿Olvidaste tu contraseña?{" "}
        <Link href="/recover" className="underline hover:text-[color:var(--fg)]">
          Recuperar con preguntas de seguridad
        </Link>
      </p>
    </main>
  );
}
