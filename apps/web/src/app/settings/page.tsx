import { getActivePortfolio } from "@/lib/queries";
import { GuardrailsForm } from "@/components/guardrails-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-4 text-[color:var(--muted)]">No hay portfolio activo.</p>
      </main>
    );
  }

  const g = portfolio.guardrails;
  if (!g) {
    return (
      <main>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-4 text-[color:var(--muted)]">
          No hay guardrails aún. El worker los crea al primer arranque.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6 max-w-2xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings — Guardrails</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">
          Límites duros validados en el MCP. Cambios toman efecto en el próximo ciclo.
        </p>
      </header>

      <GuardrailsForm
        initial={{
          maxPerTradePct: Number(g.maxPerTradePct),
          stopLossPct: Number(g.stopLossPct),
          takeProfitPct: g.takeProfitPct == null ? null : Number(g.takeProfitPct),
          dailyLossLimitPct: Number(g.dailyLossLimitPct),
          maxOpenPositions: g.maxOpenPositions,
        }}
      />
    </main>
  );
}
