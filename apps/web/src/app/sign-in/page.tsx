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
    <div className="min-h-screen flex flex-col">
      <header className="bg-bg flex justify-between items-center w-full px-4 h-12 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
          <span className="text-primary font-bold tracking-tighter text-lg">◆ CryptoPilot</span>
        </div>
        <div className="label-caps text-primary">TERMINAL ACCESS</div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[400px] border border-white/10 bg-surface-container-low p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="display-mono text-on-surface uppercase tracking-tighter">Login</h1>
            <p className="label-caps text-outline">Secure Terminal Connection Required</p>
          </div>

          <SignInForm next={sp.next ?? "/"} />

          <div className="flex justify-start">
            <Link
              href="/recover"
              className="label-caps text-outline hover:text-primary transition-colors"
            >
              ¿Olvidaste tu contraseña?{" "}
              <span className="text-primary/70">Recuperar con preguntas de seguridad</span>
            </Link>
          </div>

          <div className="mt-4 pt-6 border-t border-white/5 flex items-center gap-3">
            <span className="material-symbols-outlined text-[14px] text-outline">lock</span>
            <span className="label-caps text-outline" style={{ fontSize: "9px" }}>
              AES-256 Encrypted Tunnel Active
            </span>
          </div>
        </div>
      </main>

      <footer className="w-full p-4 flex justify-between items-center pointer-events-none">
        <div className="font-mono text-[9px] text-surface-bright uppercase">
          System: v2.0.4-Stable
        </div>
        <div className="font-mono text-[9px] text-surface-bright uppercase">LATENCY: &lt;50MS</div>
      </footer>
    </div>
  );
}
