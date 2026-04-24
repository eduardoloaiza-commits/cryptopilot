import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import {
  createSession,
  normalizeEmail,
  setSessionCookie,
  verifySecret,
} from "@/lib/auth";

const BodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "credenciales inválidas" }, { status: 400 });
  }

  const email = normalizeEmail(body.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  // Mensaje genérico — no filtramos si el email existe o no.
  if (!user) {
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: "credenciales inválidas" }, { status: 401 });
  }

  const ok = await verifySecret(body.data.password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "credenciales inválidas" }, { status: 401 });
  }

  const { token, expiresAt } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  });
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ ok: true });
}
