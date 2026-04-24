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
    <main className="space-y-6 max-w-2xl">
      <header>
        <h1 className="display-mono text-on-surface uppercase">Account</h1>
        <p className="label-caps text-outline mt-1">
          SESSION · <span className="text-on-surface">{me.email}</span>
        </p>
      </header>
      <AccountForms initialQuestions={questions} />
    </main>
  );
}
