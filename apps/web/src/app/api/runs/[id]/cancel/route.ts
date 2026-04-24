import { NextResponse } from "next/server";
import { prisma } from "@cryptopilot/db";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const run = await prisma.evaluationRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (run.status !== "running") {
    return NextResponse.json({ error: `status=${run.status}, nada que cancelar` }, { status: 400 });
  }
  const updated = await prisma.evaluationRun.update({
    where: { id },
    data: { status: "cancelled", finalizedAt: new Date() },
  });
  return NextResponse.json(updated);
}
