import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionUser, userCount } from "@/lib/auth";
import { RecoverForm } from "@/components/recover-form";

export const dynamic = "force-dynamic";

export default async function RecoverPage() {
  if (await getSessionUser()) redirect("/");
  if ((await userCount()) === 0) redirect("/setup");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-bg flex justify-between items-center w-full px-4 h-12 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
          <span className="text-primary font-bold tracking-tighter text-lg">◆ CryptoPilot</span>
        </div>
        <div className="label-caps text-tertiary">RECOVERY MODE</div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-[480px]">
          <div className="bg-surface-container-low border border-white/10 p-8">
            <div className="mb-6 border-b border-white/10 pb-6">
              <h1 className="display-mono text-on-surface uppercase tracking-tighter mb-2">
                Recover
              </h1>
              <p className="label-caps text-outline">Security Questions Protocol</p>
              <p className="text-[13px] text-on-surface-variant mt-3">
                Ingresa tu email, responde las 3 preguntas que configuraste y define una nueva contraseña.
              </p>
            </div>
            <RecoverForm />
          </div>
          <div className="mt-4 flex justify-center">
            <Link
              href="/sign-in"
              className="label-caps text-outline hover:text-primary transition-colors"
            >
              ← Volver a login
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
