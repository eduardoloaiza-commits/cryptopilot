import { getActivePortfolio } from "@/lib/queries";
import { GuardrailsForm } from "@/components/guardrails-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SettingsPage() {
  const portfolio = await getActivePortfolio();
  if (!portfolio) {
    return (
      <main>
        <h1 className="display-mono text-on-surface uppercase">Settings</h1>
        <p className="mt-4 text-[13px] text-outline">No hay portfolio activo.</p>
      </main>
    );
  }

  const g = portfolio.guardrails;
  if (!g) {
    return (
      <main>
        <h1 className="display-mono text-on-surface uppercase">Settings</h1>
        <p className="mt-4 text-[13px] text-outline">
          No hay guardrails aún. El worker los crea al primer arranque.
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6 max-w-2xl">
      <header>
        <h1 className="display-mono text-on-surface uppercase">Guardrails</h1>
        <p className="label-caps text-outline mt-1">
          HARD LIMITS · MCP-ENFORCED · CAMBIOS APLICAN EN EL PRÓXIMO CICLO
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
