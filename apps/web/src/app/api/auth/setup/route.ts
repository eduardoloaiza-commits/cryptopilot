import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import {
  createSession,
  hashSecret,
  normalizeAnswer,
  normalizeEmail,
  setSessionCookie,
  userCount,
} from "@/lib/auth";

const QuestionSchema = z.object({
  question: z.string().trim().min(8).max(160),
  answer: z.string().trim().min(2).max(160),
});

const BodySchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
  questions: z.array(QuestionSchema).length(3),
});

export async function POST(req: Request) {
  if ((await userCount()) > 0) {
    return NextResponse.json({ error: "setup already done" }, { status: 409 });
  }

  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: body.error.flatten() }, { status: 400 });

  const email = normalizeEmail(body.data.email);
  const passwordHash = await hashSecret(body.data.password);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      securityQuestions: {
        create: await Promise.all(
          body.data.questions.map(async (q, i) => ({
            position: i + 1,
            question: q.question.trim(),
            answerHash: await hashSecret(normalizeAnswer(q.answer)),
          })),
        ),
      },
    },
  });

  const { token, expiresAt } = await createSession({
    userId: user.id,
    userAgent: req.headers.get("user-agent"),
    ipAddress: req.headers.get("x-forwarded-for") ?? null,
  });
  await setSessionCookie(token, expiresAt);

  return NextResponse.json({ ok: true, userId: user.id });
}
