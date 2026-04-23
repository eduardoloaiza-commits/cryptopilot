import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";

const BodySchema = z.object({ reason: z.string().min(3) });

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  await prisma.guardrails.update({
    where: { portfolioId: portfolio.id },
    data: { killSwitchTriggered: true, killSwitchReason: body.data.reason },
  });

  await prisma.agentLog.create({
    data: {
      portfolioId: portfolio.id,
      role: "ORCHESTRATOR",
      phase: "DECIDE",
      toolName: "kill_switch_web",
      input: { reason: body.data.reason },
      output: { killed: true },
      level: "warn",
    },
  });

  return NextResponse.json({ killed: true, reason: body.data.reason });
}
