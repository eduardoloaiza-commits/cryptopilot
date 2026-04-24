import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

export * from "@prisma/client";

export type ActiveMode = "PAPER" | "TESTNET" | "LIVE";

/**
 * Resuelve el modo activo del sistema.
 * Preferencia: SystemState.activeMode (DB) > MODE env > "PAPER".
 */
export async function getActiveMode(): Promise<ActiveMode> {
  try {
    const state = await prisma.systemState.findUnique({ where: { id: "singleton" } });
    if (state?.activeMode) return state.activeMode;
  } catch {
    // tabla aún no migrada o conexión caída — fallback al env
  }
  const raw = (process.env.MODE ?? "PAPER").toUpperCase();
  if (raw === "PAPER" || raw === "TESTNET" || raw === "LIVE") return raw;
  return "PAPER";
}
