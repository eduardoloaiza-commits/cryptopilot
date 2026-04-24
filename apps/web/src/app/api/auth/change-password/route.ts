import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { getSessionUser, hashSecret, verifySecret } from "@/lib/auth";

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ok = await verifySecret(body.data.currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "contraseña actual incorrecta" }, { status: 401 });

  const newHash = await hashSecret(body.data.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });
  return NextResponse.json({ ok: true });
}
