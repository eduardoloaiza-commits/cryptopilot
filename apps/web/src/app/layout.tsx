import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
  { href: "/runs", label: "Runs" },
  { href: "/settings", label: "Settings" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = process.env.MODE ?? "PAPER";
  const modeVariant: "muted" | "warn" | "destructive" =
    mode === "LIVE" ? "destructive" : mode === "TESTNET" ? "warn" : "muted";
  return (
    <html lang="es">
      <body>
        <nav className="border-b border-white/10 bg-black/40 backdrop-blur sticky top-0 z-10">
          <div className="mx-auto max-w-6xl px-6 py-3 flex items-center gap-6">
            <Link href="/" className="font-semibold tracking-tight">
              <span className="text-[color:var(--accent)]">◆</span> CryptoPilot
            </Link>
            <div className="flex gap-1 text-sm">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-2 py-1 rounded text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-white/5 transition"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2 text-xs">
              <span className="text-[color:var(--muted)]">MODE:</span>
              <Badge variant={modeVariant}>{mode}</Badge>
            </div>
          </div>
        </nav>
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </body>
    </html>
  );
}
