import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@cryptopilot/db";
import { normalizeEmail } from "@/lib/auth";

const BodySchema = z.object({
  email: z.string().trim().email(),
});

export async function POST(req: Request) {
  const body = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) return NextResponse.json({ error: "email inválido" }, { status: 400 });

  const email = normalizeEmail(body.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
    include: { securityQuestions: { orderBy: { position: "asc" } } },
  });

  // Para no filtrar existencia de usuarios, devolvemos siempre 3 preguntas
  // genéricas si el email no existe. Solo el flujo /reset descubre si el
  // email es real (cuando las respuestas no matchean).
  if (!user || user.securityQuestions.length !== 3) {
    return NextResponse.json({
      questions: [
        { position: 1, question: "Pregunta 1" },
        { position: 2, question: "Pregunta 2" },
        { position: 3, question: "Pregunta 3" },
      ],
    });
  }

  return NextResponse.json({
    questions: user.securityQuestions.map((q) => ({
      position: q.position,
      question: q.question,
    })),
  });
}
