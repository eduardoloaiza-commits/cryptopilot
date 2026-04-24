import { redirect } from "next/navigation";
import { prisma } from "@cryptopilot/db";
import { getSessionUser } from "@/lib/auth";
import { AccountForms } from "@/components/account-forms";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const me = await getSessionUser();
  if (!me) redirect("/sign-in");

  const questions = await prisma.securityQuestion.findMany({
    where: { userId: me.id },
    orderBy: { position: "asc" },
    select: { position: true, question: true },
  });

  return (
    <main className="space-y-6 max-w-xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Mi cuenta</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Sesión iniciada como <span className="text-[color:var(--fg)]">{me.email}</span>.
        </p>
      </header>
      <AccountForms initialQuestions={questions} />
    </main>
  );
}
