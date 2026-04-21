export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">CryptoPilot</h1>
        <p className="text-[color:var(--muted)]">
          Trading autónomo de cripto con IA multi-agente — Analista, Trader, Risk Manager, Contador.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card title="Equity">
          <p className="text-4xl font-semibold">—</p>
          <p className="text-sm text-[color:var(--muted)]">sin portfolio aún</p>
        </Card>
        <Card title="P&amp;L del día">
          <p className="text-4xl font-semibold">—</p>
        </Card>
        <Card title="Modo">
          <p className="text-4xl font-semibold">PAPER</p>
        </Card>
      </section>

      <section className="mt-8 rounded-lg border border-white/10 p-6">
        <h2 className="text-xl font-semibold mb-2">Agentes</h2>
        <ul className="space-y-1 text-sm text-[color:var(--muted)]">
          <li>Orchestrator — coordina el ciclo</li>
          <li>Analista — detecta señales</li>
          <li>Trader — propone y ejecuta órdenes</li>
          <li>Risk Manager — veta y protege capital</li>
          <li>Contador — registra y reporta</li>
        </ul>
      </section>
    </main>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-white/10 p-6">
      <h3 className="text-sm uppercase tracking-wide text-[color:var(--muted)]">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}
