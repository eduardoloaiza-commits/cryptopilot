import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";

const BodySchema = z.object({
  maxPerTradePct: z.number().gt(0).lte(0.5).optional(),
  stopLossPct: z.number().gt(0).lte(0.5).optional(),
  takeProfitPct: z.number().gt(0).lte(1).nullable().optional(),
  dailyLossLimitPct: z.number().gt(0).lte(0.5).optional(),
  maxOpenPositions: z.number().int().min(1).max(10).optional(),
});

export async function GET() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });
  const g = await prisma.guardrails.findUnique({ where: { portfolioId: portfolio.id } });
  if (!g) return NextResponse.json({ error: "no guardrails" }, { status: 404 });
  return NextResponse.json({
    maxPerTradePct: Number(g.maxPerTradePct),
    stopLossPct: Number(g.stopLossPct),
    takeProfitPct: g.takeProfitPct == null ? null : Number(g.takeProfitPct),
    dailyLossLimitPct: Number(g.dailyLossLimitPct),
    maxOpenPositions: g.maxOpenPositions,
    killSwitchTriggered: g.killSwitchTriggered,
    paused: g.paused,
    updatedAt: g.updatedAt,
  });
}

export async function PATCH(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  const current = await prisma.guardrails.findUnique({ where: { portfolioId: portfolio.id } });
  if (!current) return NextResponse.json({ error: "no guardrails" }, { status: 404 });

  const updated = await prisma.guardrails.update({
    where: { portfolioId: portfolio.id },
    data: { ...body.data, proposedByAi: false, approvedAt: new Date() },
  });

  await prisma.agentLog.create({
    data: {
      portfolioId: portfolio.id,
      role: "ORCHESTRATOR",
      phase: "DECIDE",
      toolName: "guardrails_edit_web",
      input: body.data,
      output: {
        before: {
          maxPerTradePct: Number(current.maxPerTradePct),
          stopLossPct: Number(current.stopLossPct),
          takeProfitPct: current.takeProfitPct == null ? null : Number(current.takeProfitPct),
          dailyLossLimitPct: Number(current.dailyLossLimitPct),
          maxOpenPositions: current.maxOpenPositions,
        },
      },
      level: "warn",
    },
  });

  return NextResponse.json({ ok: true, updatedAt: updated.updatedAt });
}
