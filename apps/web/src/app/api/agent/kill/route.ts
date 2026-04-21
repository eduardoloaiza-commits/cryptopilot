import { NextResponse } from "next/server";
import { z } from "zod";

const BodySchema = z.object({ reason: z.string().min(3) });

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  // TODO: autenticar con Clerk, setear Guardrails.killSwitchTriggered = true
  return NextResponse.json({ killed: true, reason: body.data.reason });
}
