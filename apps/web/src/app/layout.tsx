import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoPilot",
  description: "Trading autónomo de cripto con IA multi-agente",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/trades", label: "Trades" },
  { href: "/logs", label: "Agent Logs" },
  { href: "/reports", label: "Reports" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <nav className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">
              <span className="text-[color:var(--accent)]">◆</span> CryptoPilot
            </Link>
            <div className="flex gap-4 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[color:var(--muted)] hover:text-[color:var(--fg)] transition"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="ml-auto text-xs px-2 py-1 rounded border border-white/10 text-[color:var(--muted)]">
              MODE: <span className="text-[color:var(--fg)]">{process.env.MODE ?? "PAPER"}</span>
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
