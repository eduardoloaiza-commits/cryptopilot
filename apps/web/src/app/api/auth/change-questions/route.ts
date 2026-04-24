import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { getSessionUser, hashSecret, normalizeAnswer, verifySecret } from "@/lib/auth";

const QuestionSchema = z.object({
  question: z.string().trim().min(8).max(160),
  answer: z.string().trim().min(2).max(160),
});

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  questions: z.array(QuestionSchema).length(3),
});

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ok = await verifySecret(body.data.currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "contraseña incorrecta" }, { status: 401 });

  const hashed = await Promise.all(
    body.data.questions.map(async (q, i) => ({
      userId: user.id,
      position: i + 1,
      question: q.question.trim(),
      answerHash: await hashSecret(normalizeAnswer(q.answer)),
    })),
  );

  await prisma.$transaction([
    prisma.securityQuestion.deleteMany({ where: { userId: user.id } }),
    prisma.securityQuestion.createMany({ data: hashed }),
  ]);

  return NextResponse.json({ ok: true });
}
