import { NextResponse } from "next/server";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";

export async function POST() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  await prisma.guardrails.update({
    where: { portfolioId: portfolio.id },
    data: { paused: false, pausedReason: null },
  });

  await prisma.agentLog.create({
    data: {
      portfolioId: portfolio.id,
      role: "ORCHESTRATOR",
      phase: "DECIDE",
      toolName: "resume_web",
      input: {},
      output: { resumed: true },
      level: "info",
    },
  });

  return NextResponse.json({ resumed: true });
}
