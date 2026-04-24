import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/user-menu";
import { getSessionUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoPilot | Terminal Dashboard",
  description: "Trading autónomo de cripto con IA multi-agente",
};

const NAV = [
  { href: "/", label: "Dashboard", icon: "dashboard" },
  { href: "/trades", label: "Trades", icon: "swap_horiz" },
  { href: "/logs", label: "Agent Logs", icon: "receipt_long" },
  { href: "/reports", label: "Reports", icon: "description" },
  { href: "/runs", label: "Runs", icon: "play_circle" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

const PUBLIC_PATHS = new Set(["/sign-in", "/setup", "/recover"]);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = process.env.MODE ?? "PAPER";
  const modeVariant: "muted" | "warn" | "destructive" =
    mode === "LIVE" ? "destructive" : mode === "TESTNET" ? "warn" : "muted";

  const pathname = (await headers()).get("x-invoke-path") ?? "";
  const isPublic = PUBLIC_PATHS.has(pathname);
  const user = isPublic ? null : await getSessionUser();

  if (isPublic) {
    return (
      <html lang="es" className="dark">
        <body>{children}</body>
      </html>
    );
  }

  return (
    <html lang="es" className="dark">
      <body>
        <header className="bg-bg flex justify-between items-center w-full px-4 h-12 border-b border-white/10 fixed top-0 left-0 right-0 z-50">
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
            <span className="text-primary font-bold tracking-tighter text-lg">◆ CryptoPilot</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              <span className="label-caps text-outline">MODE</span>
              <Badge variant={modeVariant}>{mode}</Badge>
            </div>
            {user && <UserMenu email={user.email} />}
          </div>
        </header>

        <aside className="hidden md:flex flex-col fixed left-0 top-12 bottom-0 z-40 bg-bg border-r border-white/10 w-56">
          <div className="px-3 py-5">
            <h2 className="label-caps text-on-surface-variant px-4 mb-4">TERMINAL MENU</h2>
            <nav className="space-y-0.5">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-2.5 text-outline label-caps hover:bg-white/5 hover:text-on-surface transition-colors border-l-2 border-transparent hover:border-primary/40"
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <main className="pt-12 md:ml-56 min-h-screen">
          <div className="px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
