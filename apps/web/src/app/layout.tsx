import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { getActiveMode } from "@cryptopilot/db";
import { UserMenu } from "@/components/user-menu";
import { ModeSwitcher } from "@/components/mode-switcher";
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
  const pathname = (await headers()).get("x-invoke-path") ?? "";
  const isPublic = PUBLIC_PATHS.has(pathname);
  const [user, mode] = isPublic
    ? [null, "PAPER" as const]
    : await Promise.all([getSessionUser(), getActiveMode()]);

  return (
    <html lang="es" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body>
        {isPublic ? (
          children
        ) : (
          <>
            <header className="bg-bg flex justify-between items-center w-full px-4 h-12 border-b border-white/10 fixed top-0 left-0 right-0 z-50">
              <Link href="/" className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  terminal
                </span>
                <span className="text-primary font-bold tracking-tighter text-lg">
                  ◆ CryptoPilot
                </span>
              </Link>
              <div className="flex items-center gap-3">
                <span className="label-caps text-outline hidden sm:inline">MODE</span>
                <ModeSwitcher current={mode} />
                {user && <UserMenu email={user.email} />}
              </div>
            </header>

            <aside className="hidden md:flex flex-col fixed left-0 top-12 bottom-0 z-40 bg-bg border-r border-white/10 w-56">
              <div className="px-2 py-5">
                <h2 className="label-caps text-outline px-3 mb-3">TERMINAL MENU</h2>
                <nav className="space-y-px">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="group flex items-center gap-3 px-3 py-2.5 text-outline hover:bg-white/[0.04] hover:text-on-surface transition-colors border-l-2 border-transparent hover:border-primary/60"
                    >
                      <span className="material-symbols-outlined text-[18px] w-5 text-center text-outline group-hover:text-primary">
                        {item.icon}
                      </span>
                      <span className="label-caps">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="mt-auto px-4 py-4 border-t border-white/10 font-mono text-[9px] text-surface-bright uppercase">
                <div>v0.1 · Stitch Alpha</div>
                <div>worker · pm2 / VPS</div>
              </div>
            </aside>

            <main className="pt-12 md:ml-56 min-h-screen">
              <div className="px-4 py-6 md:px-6 md:py-8">{children}</div>
            </main>
          </>
        )}
      </body>
    </html>
  );
}
