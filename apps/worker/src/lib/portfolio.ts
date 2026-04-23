import { prisma, Prisma } from "@cryptopilot/db";
import { logger } from "./logger.js";

const INITIAL_CAPITAL_USDT = Number(
  process.env.INITIAL_CAPITAL_USDT ?? "1000",
);

function resolveMode(): "PAPER" | "TESTNET" | "LIVE" {
  const raw = (process.env.MODE ?? "PAPER").toUpperCase();
  if (raw === "PAPER" || raw === "TESTNET" || raw === "LIVE") return raw;
  throw new Error(`Invalid MODE: ${raw}`);
}

/**
 * Idempotente: devuelve el Portfolio del modo actual.
 * Si no existe, lo crea con capital inicial + guardrails por defecto.
 */
export async function ensurePortfolio() {
  const mode = resolveMode();
  const existing = await prisma.portfolio.findFirst({
    where: { mode },
    include: { guardrails: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  logger.info({ mode, capital: INITIAL_CAPITAL_USDT }, "portfolio.create");

  const created = await prisma.portfolio.create({
    data: {
      mode,
      initialCapital: new Prisma.Decimal(INITIAL_CAPITAL_USDT),
      currentEquity: new Prisma.Decimal(INITIAL_CAPITAL_USDT),
      movements: {
        create: {
          kind: "DEPOSIT",
          amountUsdt: new Prisma.Decimal(INITIAL_CAPITAL_USDT),
          note: `Seed initial capital (${mode})`,
        },
      },
      guardrails: {
        create: {
          maxPerTradePct: new Prisma.Decimal("0.02"),
          stopLossPct: new Prisma.Decimal("0.01"),
          takeProfitPct: new Prisma.Decimal("0.02"),
          dailyLossLimitPct: new Prisma.Decimal("0.05"),
          maxOpenPositions: 3,
        },
      },
    },
    include: { guardrails: true },
  });

  return created;
}

export async function getActivePortfolio() {
  const mode = resolveMode();
  return prisma.portfolio.findFirst({
    where: { mode },
    include: { guardrails: true },
    orderBy: { createdAt: "asc" },
  });
}
