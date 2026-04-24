import { redirect } from "next/navigation";
import { userCount } from "@/lib/auth";
import { SetupForm } from "@/components/setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if ((await userCount()) > 0) redirect("/sign-in");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-bg flex justify-between items-center w-full px-4 h-12 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
          <span className="text-primary font-bold tracking-tighter text-lg">◆ CryptoPilot</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="label-caps text-outline">STATUS: INITIALIZING</span>
          <span className="label-caps text-primary border border-primary/40 px-2 py-0.5">
            SETUP MODE
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-[560px]">
          <div className="bg-surface-container-low border border-white/10 p-8">
            <div className="mb-8 border-b border-white/10 pb-6">
              <h1 className="display-mono text-primary mb-2">System Authentication Setup</h1>
              <p className="text-on-surface-variant text-[13px]">
                Establish your primary credentials and security recovery protocols for the terminal.
              </p>
            </div>
            <SetupForm />
          </div>

          <div className="mt-4 flex justify-between items-center text-outline font-mono text-[10px] uppercase">
            <span>Encrypted Layer: AES-256</span>
            <span>Revision: 4.0.2</span>
            <span>No SMTP Required</span>
          </div>
        </div>
      </main>
    </div>
  );
}
