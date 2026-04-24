import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import {
  createSession,
  hashSecret,
  normalizeAnswer,
  normalizeEmail,
  setSessionCookie,
  verifySecret,
} from "@/lib/auth";

const AnswerSchema = z.object({
  position: z.number().int().min(1).max(3),
  answer: z.string().trim().min(1),
});

const BodySchema = z.object({
  email: z.string().trim().email(),
  answers: z.array(AnswerSchema).length(3),
  newPassword: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "datos inválidos" }, { status: 400 });
  }

  const email = normalizeEmail(body.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { securityQuestions: true },
  });

  // Mensaje genérico — no decimos si el email existe o si fallaron respuestas.
  const FAIL = NextResponse.json(
    { error: "respuestas no coinciden" },
    { status: 401 },
  );

  if (!user || user.securityQuestions.length !== 3) {
    await new Promise((r) => setTimeout(r, 250));
    return FAIL;
  }

  // Validar las 3 respuestas
  for (const ans of body.data.answers) {
    const q = user.securityQuestions.find((x) => x.position === ans.position);
    if (!q) return FAIL;
    const ok = await verifySecret(normalizeAnswer(ans.answer), q.answerHash);
    if (!ok) return FAIL;
  }

  // Reset password + invalida todas las sesiones existentes
  const newHash = await hashSecret(body.data.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  // Loggea automáticamente
  const { token, expiresAt } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  });
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ ok: true });
}
