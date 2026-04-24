import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";

const BodySchema = z.object({
  durationHours: z.number().min(0.25).max(168), // 15 min .. 7 días
  label: z.string().max(120).optional(),
});

export async function GET() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });
  const runs = await prisma.evaluationRun.findMany({
    where: { portfolioId: portfolio.id },
    orderBy: { startedAt: "desc" },
    take: 50,
  });
  return NextResponse.json(runs);
}

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  const running = await prisma.evaluationRun.findFirst({
    where: { portfolioId: portfolio.id, status: "running" },
  });
  if (running) {
    return NextResponse.json(
      { error: "Ya hay una corrida activa", runId: running.id },
      { status: 409 },
    );
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + body.data.durationHours * 3_600_000);
  const created = await prisma.evaluationRun.create({
    data: {
      portfolioId: portfolio.id,
      label: body.data.label,
      startedAt: now,
      endsAt,
      startEquity: portfolio.currentEquity,
      status: "running",
    },
  });

  await prisma.agentLog.create({
    data: {
      portfolioId: portfolio.id,
      role: "ORCHESTRATOR",
      phase: "SCAN",
      toolName: "run_start_web",
      input: { durationHours: body.data.durationHours, label: body.data.label },
      output: { runId: created.id, endsAt: endsAt.toISOString() },
      level: "info",
    },
  });

  return NextResponse.json(created, { status: 201 });
}
