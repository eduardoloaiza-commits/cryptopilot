# CryptoPilot

Trading autónomo de cripto (spot) con IA **multi-agente** via **MCP** + **Claude Agent SDK** + Binance.

Objetivo: microoperaciones tipo forex sobre BTCUSDT / ETHUSDT / SOLUSDT / BNBUSDT con meta de rentabilidad diaria positiva, 100% operado por agentes IA especializados.

## Agentes

| Rol | Responsabilidad | Modelo |
|---|---|---|
| **Orchestrator** | Coordina el ciclo (30s): pide señales → decide → ejecuta → registra | sonnet |
| **Analista** | Detecta señales técnicas (RSI, EMA, BB, ATR) ranked por confianza | sonnet |
| **Trader** | Sizing, SL/TP, ejecución vía MCP | sonnet |
| **Risk Manager** | Veta ciclos/órdenes, dispara kill-switch, trailing | sonnet |
| **Contador** | Registra P&L, reconcilia, genera `DailyReport` markdown | haiku |
| **Researcher** (fase 2) | Noticias, sentiment, macro | haiku |

Cada agente tiene **skills** reutilizables en `apps/worker/.claude/skills/` y definición markdown en `apps/worker/.claude/agents/` (también invocable manualmente desde Claude Code).

## Estructura

```
apps/
  web/       Next.js 16 + Tailwind (dashboard, API control) — Vercel
  worker/    Claude Agent SDK + node-cron (loop 24/7) — Hostinger VPS (pm2)
packages/
  mcp-binance/  MCP server stdio con tools de Binance (market/trading/portfolio/guardrails)
  db/           Prisma schema + cliente (Neon Postgres)
  shared/       zod schemas + constantes
```

## Modos (var `MODE`)

- `PAPER` — simula fills con precio real + slippage, sin tocar Binance. Arranque recomendado.
- `TESTNET` — Binance Spot Testnet (https://testnet.binance.vision).
- `LIVE` — producción. Requiere validar ≥48h en TESTNET primero.

## Guardrails duros (código, no prompt)

1. Whitelist de símbolos (los 4 mayores vs USDT).
2. Stop-loss obligatorio en cada entrada.
3. Max por trade ≤ `equity * maxPerTradePct` (default 2%).
4. Pérdida diaria máxima ≤ `dailyLossLimitPct` (default 5%) → kill-switch.
5. Max posiciones abiertas = 3.
6. Rate limit de órdenes/min.
7. Pre-flight equity check (divergencia DB vs Binance > 1% → pausa).

La IA **no puede saltarse** estos límites — se validan en `packages/mcp-binance/src/tools/guardrails.ts`.

## Comandos

```bash
pnpm install
cp .env.example .env     # completar keys (anthropic, binance testnet, db, clerk)

# DB
pnpm --filter @cryptopilot/db prisma generate
pnpm --filter @cryptopilot/db prisma migrate dev

# Dev (paralelo)
pnpm --filter @cryptopilot/mcp-binance build
MODE=PAPER pnpm --filter @cryptopilot/worker dev
pnpm --filter @cryptopilot/web dev
```

## Inspección manual del MCP

```bash
npx @modelcontextprotocol/inspector node packages/mcp-binance/dist/server.js
```

## Debug conversacional de un agente

Abre Claude Code dentro de `apps/worker/` y pide al Orchestrator que delegue, ej:

> @analyst analiza el mercado ahora y devuélveme señales

Claude Code carga automáticamente `.claude/agents/analyst.md` y sus skills.

## Fases

- [x] 0. Scaffold monorepo
- [ ] 1. MCP server Binance (tools con wrapper real)
- [ ] 2. Paper trading engine (simulación de fills)
- [ ] 3. Agent SDK loop multi-agente (orchestrator + 4 roles)
- [ ] 4. Dashboard (P&L live, control, reporte diario)
- [ ] 5. Testnet 48h continuo
- [ ] 6. Deploy worker a VPS Hostinger (pm2)
- [ ] 7. LIVE con capital acotado

Plan completo: `/Users/eloaiza/.claude/plans/claude-quiero-crear-una-quiet-quokka.md`.
