import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CryptoPilot",
  description: "Trading autónomo de cripto con IA multi-agente",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
