import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, getActiveMode } from "@cryptopilot/db";
import { getSessionUser } from "@/lib/auth";

const BodySchema = z.object({
  mode: z.enum(["PAPER", "TESTNET", "LIVE"]),
});

export async function GET() {
  const mode = await getActiveMode();
  return NextResponse.json({ mode });
}

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const previous = await getActiveMode();
  if (previous === body.data.mode) {
    return NextResponse.json({ ok: true, mode: previous, changed: false });
  }

  // Garantiza que existe Portfolio para el modo destino antes de switch.
  // El worker creará uno on-demand en `ensurePortfolio` la próxima vez,
  // pero lo precreamos para que la UI lo encuentre inmediato.
  const existing = await prisma.portfolio.findFirst({
    where: { mode: body.data.mode },
  });
  if (!existing) {
    await prisma.portfolio.create({
      data: {
        mode: body.data.mode,
        initialCapital: 1000,
        currentEquity: 1000,
        movements: {
          create: {
            kind: "DEPOSIT",
            amountUsdt: 1000,
            note: `Seed initial capital (${body.data.mode}) — created by mode switch`,
          },
        },
        guardrails: {
          create: {
            maxPerTradePct: 0.02,
            stopLossPct: 0.01,
            takeProfitPct: 0.02,
            dailyLossLimitPct: 0.05,
            maxOpenPositions: 3,
          },
        },
      },
    });
  }

  await prisma.systemState.upsert({
    where: { id: "singleton" },
    update: { activeMode: body.data.mode, updatedBy: me.email },
    create: { id: "singleton", activeMode: body.data.mode, updatedBy: me.email },
  });

  // Audit log
  await prisma.agentLog.create({
    data: {
      role: "ORCHESTRATOR",
      phase: "DECIDE",
      toolName: "mode_switch_web",
      input: { from: previous, to: body.data.mode, by: me.email },
      output: { ok: true },
      level: "warn",
    },
  });

  return NextResponse.json({
    ok: true,
    previous,
    mode: body.data.mode,
    changed: true,
    note: "El worker leerá el nuevo modo en su próximo ciclo (≤3 min).",
  });
}
