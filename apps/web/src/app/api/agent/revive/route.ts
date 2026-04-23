import { NextResponse } from "next/server";
import { prisma } from "@cryptopilot/db";
import { getActivePortfolio } from "@/lib/queries";

export async function POST() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) return NextResponse.json({ error: "no portfolio" }, { status: 404 });

  await prisma.guardrails.update({
    where: { portfolioId: portfolio.id },
    data: { killSwitchTriggered: false, killSwitchReason: null },
  });

  await prisma.agentLog.create({
    data: {
      portfolioId: portfolio.id,
      role: "ORCHESTRATOR",
      phase: "DECIDE",
      toolName: "revive_web",
      input: {},
      output: { revived: true },
      level: "info",
    },
  });

  return NextResponse.json({ revived: true });
}
