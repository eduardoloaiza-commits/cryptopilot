import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";

const BodySchema = z.object({
  totalHours: z.number().min(0.25).max(168),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const run = await prisma.evaluationRun.findUnique({ where: { id } });
  if (!run) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (run.status !== "running") {
    return NextResponse.json(
      { error: `status=${run.status}, solo runs activos pueden ajustarse` },
      { status: 400 },
    );
  }

  const newEndsAt = new Date(run.startedAt.getTime() + body.data.totalHours * 3_600_000);
  // Si la nueva fecha ya pasó, marcamos como "a finalizar en el próximo sweep"
  // (el worker cierra runs cuyo endsAt <= now en su cron de 1 min).
  const now = new Date();
  const clampedEndsAt = newEndsAt.getTime() < now.getTime() ? now : newEndsAt;

  const updated = await prisma.evaluationRun.update({
    where: { id },
    data: { endsAt: clampedEndsAt },
  });

  return NextResponse.json(updated);
}
