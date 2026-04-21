# CryptoPilot — Documentación del Proyecto

> Sistema autónomo de inversión en criptoactivos operado por **múltiples agentes IA** especializados, conectado a Binance vía un **servidor MCP propio** y orquestado con el **Claude Agent SDK**.

Última actualización: 2026-04-21

---

## 1. Visión y objetivo

**Propósito:** gestionar de forma autónoma una cartera spot en Binance, descubrir oportunidades de inversión, ejecutar microoperaciones tipo forex, administrar el riesgo y entregar al cierre de cada día un reporte con los resultados.

**Meta operativa:** rentabilidad diaria positiva (target > 0% después de fees), con drawdown máximo controlado por guardrails.

**Alcance inicial:**
- Mercado: Spot.
- Pares: `BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `BNBUSDT`.
- Operaciones: scalping intradía (ventanas 1m – 15m).

**Evolución prevista:** sumar nuevos agentes especializados (Researcher macro, Quant de backtesting, etc.) sin refactorizar la arquitectura base.

---

## 2. Arquitectura general

```
┌───────────────────────────────────────────────────────────────┐
│  Vercel — Next.js 16 (App Router)                             │
│  • Dashboard (P&L live, posiciones, trades, agent logs)       │
│  • API routes: /api/agent/* (status, kill, pause, resume)     │
│  • Auth (Clerk via Marketplace)                               │
└───────────────────▲───────────────────────────────────────────┘
                    │ lee/escribe
          ┌─────────┴──────────┐
          │  Neon Postgres     │  (Vercel Marketplace)
          │  (Prisma schema)   │
          └─────────▲──────────┘
                    │
┌───────────────────┴───────────────────────────────────────────┐
│  Hostinger VPS — Node worker 24/7 (pm2)                       │
│                                                                │
│  Orchestrator (Claude Agent SDK)                              │
│    ├─ Analista ─── detecta señales                            │
│    ├─ Risk Manager ── valida/veta                             │
│    ├─ Trader ─── propone + ejecuta                            │
│    └─ Contador ─── registra + reporte diario                  │
│                                                                │
│              ↓ via MCP stdio ↓                                 │
│  MCP Server: cryptopilot-binance                              │
│  Tools: market / trading / portfolio / guardrails             │
│              ↓                                                 │
│  Binance API (Testnet o Producción según MODE)                │
└───────────────────────────────────────────────────────────────┘
```

**Por qué separado Vercel + VPS:**
- Vercel Functions no sostienen procesos largos. El loop 24/7 vive en un VPS con pm2.
- La UI y el dashboard aprovechan la DX de Vercel.
- Comparten DB (Neon) y schema (Prisma).

---

## 3. Multi-agente: roles y responsabilidades

Cada rol tiene **system prompt propio**, **tools permitidas scoped**, **modelo adecuado al costo/precisión** y **skills** reutilizables.

| Agente | Rol | Tools permitidas | Modelo | Skills |
|---|---|---|---|---|
| **Orchestrator** | Coordina el ciclo: pide señales → decide → ejecuta → registra. Unifica el estado. | `Task` (delegar), `list_balances` | sonnet-4-6 | `cycle-orchestration` |
| **Analista de Datos** | Análisis técnico, descubrimiento de señales, ranking de oportunidades. **No ejecuta órdenes.** | `get_ticker`, `get_klines`, `analyze_volatility`, `compute_indicators` | sonnet-4-6 | `technical-analysis`, `signal-scoring` |
| **Inversionista / Trader** | Decide entradas/salidas, sizing, SL/TP. Consume señales del Analista. | `get_ticker`, `guardrail_check`, `place_order`, `cancel_order`, `get_open_orders`, `list_balances` | sonnet-4-6 | `position-sizing`, `entry-exit-rules` |
| **Risk Manager** | Monitorea drawdown, exposición, correlaciones; dispara kill-switch; propone guardrails dinámicos. Puede **vetar al Trader**. | `list_balances`, `calculate_pnl`, `kill_switch`, `update_guardrails` | sonnet-4-6 | `risk-management` |
| **Contador** | Registra movimientos, calcula P&L, reconcilia con Binance, genera `DailyReport`. | `get_trade_history`, `calculate_pnl`, `list_balances`, DB tools | haiku-4-5 | `accounting-ledger`, `daily-report-format` |
| **Researcher** _(fase 2)_ | News, sentiment, eventos macro. Enriquece señales. | `WebSearch`, `WebFetch` | haiku-4-5 | `news-sentiment` |

### Dos modos de ejecución coexistentes

1. **Modo programático 24/7 (producción):** `apps/worker/src/orchestrator.ts` invoca cada rol como `query()` separada del Agent SDK. Output estructurado con zod entre agentes. Cada llamada queda en `AgentLog` con el rol autor.

2. **Modo delegación nativa (debugging):** Definiciones en `apps/worker/.claude/agents/*.md` permiten abrir Claude Code contra el repo y conversar con el Orchestrator, que delega vía `Task` al subagente correspondiente.

Ambos modos comparten las **mismas skills** en `apps/worker/.claude/skills/` — single source of truth del conocimiento de dominio.

### Flujo de un ciclo (cada 30s)

```
Orchestrator
  ├─(1) Analista → marketSnapshot + top signals (ranked por confianza)
  ├─(2) Risk Manager (pre-cycle) → ¿permite nuevas posiciones?
  │      └─ si NO → skip ciclo + log
  ├─(3) Trader (signals + constraints) → propone orden(es)
  ├─(4) Risk Manager (pre-execution) → veta/aprueba
  ├─(5) si aprueba: Trader llama place_order (MCP revalida guardrails duros)
  └─(6) Contador → registra Trade + Movement en DB
```

Además:
- **Cada 15 min:** Risk Manager hace sweep de SL/TP (trailing si procede).
- **23:59 CLT:** Contador genera `DailyReport` (markdown) + notificación al dashboard.

---

## 4. Estructura del repositorio

```
CryptoPilot/
├── Doc/                            # ← esta documentación
│   └── OVERVIEW.md
├── apps/
│   ├── web/                        # Next.js 16 → Vercel
│   │   ├── src/app/
│   │   │   ├── page.tsx            # dashboard
│   │   │   └── api/agent/
│   │   │       ├── kill/route.ts
│   │   │       └── status/route.ts
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   └── worker/                     # Node 24/7 → Hostinger VPS (pm2)
│       ├── src/
│       │   ├── index.ts            # entrypoint
│       │   ├── orchestrator.ts     # loop principal
│       │   ├── scheduler.ts        # cron (15min sweep, 23:59 report)
│       │   ├── guardrails.ts       # kill-switch check
│       │   ├── lib/logger.ts       # pino
│       │   ├── agents/
│       │   │   ├── analyst.ts
│       │   │   ├── trader.ts
│       │   │   ├── risk-manager.ts
│       │   │   ├── accountant.ts
│       │   │   └── shared/prompts.ts
│       │   └── schemas/            # zod I/O entre agentes
│       │       ├── signal.ts
│       │       ├── order-proposal.ts
│       │       └── risk-verdict.ts
│       ├── .claude/
│       │   ├── agents/             # definiciones subagentes (modo B)
│       │   │   ├── analyst.md
│       │   │   ├── trader.md
│       │   │   ├── risk-manager.md
│       │   │   └── accountant.md
│       │   └── skills/             # conocimiento reutilizable
│       │       ├── technical-analysis/SKILL.md
│       │       ├── position-sizing/SKILL.md
│       │       ├── risk-management/SKILL.md
│       │       └── accounting-ledger/SKILL.md
│       ├── ecosystem.config.cjs    # pm2
│       └── tsconfig.json
├── packages/
│   ├── mcp-binance/                # MCP server stdio
│   │   └── src/
│   │       ├── server.ts
│   │       ├── lib/binance-client.ts
│   │       ├── lib/whitelist.ts
│   │       └── tools/
│   │           ├── market.ts       # ticker, klines, volatility, indicators
│   │           ├── trading.ts      # place_order, cancel, open_orders
│   │           ├── portfolio.ts    # balances, trade_history, pnl
│   │           └── guardrails.ts   # guardrail_check, kill_switch, update_guardrails
│   ├── db/
│   │   ├── prisma/schema.prisma
│   │   └── src/index.ts            # client singleton
│   └── shared/
│       └── src/
│           ├── constants.ts        # WHITELIST_SYMBOLS, intervalos, roles
│           └── schemas.ts          # zod: Order, Guardrails, Mode
├── .env.example
├── .gitignore
├── README.md
├── package.json                    # pnpm workspaces root
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── turbo.json
```

---

## 5. Modos de operación (variable `MODE`)

| Modo | Descripción | Cuándo usarlo |
|---|---|---|
| `PAPER` | Simula fills con precio real + slippage configurable. **Nunca toca Binance.** | Arranque. Validar la lógica del loop multi-agente sin riesgo. |
| `TESTNET` | Binance Spot Testnet (`https://testnet.binance.vision`). Saldos ficticios. | Validar integración real. Mínimo 48h antes de LIVE. |
| `LIVE` | Producción. Dinero real. | Solo tras ≥48h en TESTNET con métricas positivas y checklist completo. |

La transición entre modos es un simple cambio de variable de entorno + API keys. La lógica de los agentes es idéntica.

---

## 6. Guardrails duros (código, no prompt)

Implementados en `packages/mcp-binance/src/tools/guardrails.ts` como **validación determinística**. La IA **no puede saltárselos**:

1. **Whitelist de símbolos**: solo los 4 configurados.
2. **Stop-loss obligatorio** en toda orden de entrada.
3. **Max por trade**: `notional ≤ equity * maxPerTradePct` (default 2 %).
4. **Pérdida diaria máxima**: `dailyPnl ≥ -equity * dailyLossLimitPct` (default 5 %). Al tocarlo → kill-switch.
5. **Máx. posiciones abiertas simultáneas**: 3.
6. **Rate limit de órdenes/min**: evita tocar los límites de Binance.
7. **Pre-flight equity check**: divergencia DB vs Binance > 1 % → pausa + alerta.

Estos valores se almacenan versionados en la tabla `Guardrails` y se pueden ajustar desde el dashboard (requiere aprobación humana si la actualización **aumenta** riesgo).

---

## 7. Modelo de datos (Prisma / Neon Postgres)

Tablas principales:

- **`Portfolio`** — mode, capital inicial, equity actual. Relaciones 1:N con todo lo demás.
- **`Trade`** — cada operación con entry/exit, qty, SL, TP, status, pnlUsdt, rationale del agente que la abrió, binanceOrderId.
- **`Movement`** — ledger inmutable. Tipos: `DEPOSIT`, `WITHDRAW`, `TRADE_PNL`, `FEE`, `ADJUSTMENT`. Jamás se actualiza: errores → nuevo `ADJUSTMENT`.
- **`DailyReport`** — snapshot diario (equity inicio/fin, P&L, winrate, maxDD, summaryMd generado por el Contador).
- **`Guardrails`** — límites activos + flag `killSwitchTriggered`, `proposedByAi`, `approvedAt`.
- **`AgentLog`** — auditoría de cada decisión: `role` (qué agente), `phase` (SCAN/DECIDE/EXECUTE/REPORT/SWEEP), `toolName`, `input`, `output`, `reasoningMd`.

Precisión: todos los campos monetarios son `Decimal(20,8)`. Nunca `float`.

---

## 8. MCP server `cryptopilot-binance`

Aísla la integración con Binance detrás de un protocolo estándar. Ventajas:

- Las mismas tools son consumidas por los agentes programáticos y por Claude Code / MCP Inspector.
- Facilita swap futuro (e.g., añadir un MCP de otro exchange sin tocar los agentes).
- Los guardrails viven en el MCP — cualquier llamador queda sujeto a las mismas validaciones.

### Tools expuestas

**Market data** (`market.ts`)
- `get_ticker(symbol)`
- `get_klines(symbol, interval, limit?)`
- `analyze_volatility(symbol)` → ATR/stddev 30d
- `compute_indicators(symbol, interval)` → RSI, EMA fast/slow, Bollinger, ATR

**Trading** (`trading.ts`)
- `place_order(symbol, side, type, qty, stopLoss, limitPrice?, takeProfit?)`
- `cancel_order(symbol, orderId)`
- `get_open_orders(symbol?)`

**Portfolio** (`portfolio.ts`)
- `list_balances()`
- `get_trade_history(symbol, limit?)`
- `calculate_pnl(from?, to?)`

**Guardrails** (`guardrails.ts`)
- `guardrail_check(proposal)` — el Trader DEBE llamarlo antes de `place_order`
- `kill_switch(reason)`
- `update_guardrails(fields..., rationale)`

### Inspección manual

```bash
npx @modelcontextprotocol/inspector node packages/mcp-binance/dist/server.js
```

---

## 9. Setup y comandos

### Requisitos

- Node ≥ 20.18
- pnpm ≥ 9
- PostgreSQL (Neon vía Vercel Marketplace, recomendado)
- Cuentas: Anthropic (API key), Binance Spot Testnet, Clerk, Vercel

### Instalación

```bash
cd CryptoPilot
pnpm install
cp .env.example .env
# completar: ANTHROPIC_API_KEY, BINANCE_API_KEY, BINANCE_SECRET, DATABASE_URL, Clerk keys
```

### Base de datos

```bash
pnpm --filter @cryptopilot/db prisma generate
pnpm --filter @cryptopilot/db prisma migrate dev
```

### Desarrollo (3 terminales)

```bash
# Terminal 1 — compilar el MCP server
pnpm --filter @cryptopilot/mcp-binance build

# Terminal 2 — worker en modo PAPER
MODE=PAPER pnpm --filter @cryptopilot/worker dev

# Terminal 3 — dashboard Next.js
pnpm --filter @cryptopilot/web dev
# → http://localhost:3000
```

### Producción (VPS)

```bash
pnpm --filter @cryptopilot/worker build
pm2 start apps/worker/ecosystem.config.cjs
pm2 save && pm2 startup
```

---

## 10. Fases de implementación

- [x] **Fase 0 — Scaffold.** Monorepo pnpm, estructura multi-agente, definiciones de agentes y skills, schema Prisma, MCP server con tools stub, Next.js dashboard placeholder.
- [ ] **Fase 1 — MCP Binance real.** Implementar los stubs: `analyze_volatility` (ATR 30d), `compute_indicators` (RSI/EMA/BB/ATR), `calculate_pnl` leyendo DB, OCO con SL/TP en `place_order`.
- [ ] **Fase 2 — Paper trading engine.** Simulación de fills con ticker live + slippage configurable, persistencia idéntica a live.
- [ ] **Fase 3 — Agent SDK loop multi-agente.** Conectar cada `agents/*.ts` al `query()` del Agent SDK con MCP. Persistir todo en `AgentLog`. Flujo de proposición de guardrails iniciales con aprobación humana.
- [ ] **Fase 4 — Dashboard.** P&L live, equity curve, tabla de trades, agent logs filtrable, controles (pause/resume/kill), visor de `DailyReport`.
- [ ] **Fase 5 — Testnet.** 48–72h continuo. Checklist: ≥10 trades, SL disparado ≥1 vez, kill-switch probado, `DailyReport` consistente Binance↔DB.
- [ ] **Fase 6 — Deploy VPS.** Subir worker a Hostinger, pm2 con autorestart, health-check desde Vercel cada 5min.
- [ ] **Fase 7 — LIVE.** Capital acotado (ej. 50 USDT), review diario 2 semanas antes de escalar.

---

## 11. Extender el sistema con nuevos agentes

El diseño está preparado para agregar agentes sin refactor:

1. Crear `apps/worker/.claude/agents/<nuevo>.md` con frontmatter (`name`, `description`, `tools`, `model`) y system prompt.
2. Opcional: crear `apps/worker/.claude/skills/<skill-name>/SKILL.md` con conocimiento reutilizable.
3. Crear `apps/worker/src/agents/<nuevo>.ts` con la función `run<Nuevo>()` que invoca el Agent SDK.
4. Si consume/produce tipos estructurados: agregar schema zod en `apps/worker/src/schemas/`.
5. Agregar el enum `<NUEVO>` a `AgentRole` en `packages/db/prisma/schema.prisma` + migración.
6. Engancharlo en `orchestrator.ts` en la fase del ciclo que corresponda.

Candidatos futuros: `Researcher` (noticias/sentiment), `Quant` (backtesting histórico), `Compliance` (reglas tributarias/límites regulatorios), `Portfolio-Strategist` (rebalanceo entre pares).

---

## 12. Verificación end-to-end

### Local (PAPER)
1. `pnpm install && pnpm --filter @cryptopilot/db prisma migrate dev`
2. Correr worker + web con `MODE=PAPER`
3. Aprobar guardrails propuestos desde dashboard
4. Observar ≥1h: deben aparecer señales del Analista y trades simulados
5. Forzar `POST /api/agent/report/run` → verificar `DailyReport`

### MCP standalone
- `npx @modelcontextprotocol/inspector node packages/mcp-binance/dist/server.js`
- Llamar `analyze_volatility` con `BTCUSDT` → esperar JSON con ATR y stddev
- Llamar `place_order` sin `stopLoss` → debe retornar `isError: true`

### Testnet (48 h)
Checklist antes de LIVE:
- [ ] ≥ 10 trades ejecutados reales en testnet
- [ ] ≥ 1 SL disparado correctamente
- [ ] Kill-switch probado (forzar pérdida manual grande)
- [ ] `DailyReport` concuerda con saldos Binance ± 1 %
- [ ] `AgentLog` contiene razonamiento de cada decisión

### Tests automatizados
- Unit: guardrails (todos los casos de rechazo) en `packages/mcp-binance/__tests__/`
- Integration: tools MCP contra mock + testnet
- E2E (Playwright): flujo aprobar guardrails → iniciar worker → ver trade → kill-switch

---

## 13. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La IA entra en loop de pérdidas | Kill-switch determinístico por pérdida diaria (fuera del prompt) |
| API key comprometida | Keys Binance solo Spot, sin withdraw; rotación periódica; secret manager en VPS |
| Worker cae en VPS | pm2 autorestart + health check cron desde Vercel cada 5 min + alerta |
| Divergencia DB vs Binance | Pre-flight equity check; reconciliación diaria en el `DailyReport` |
| Costos de tokens Claude | System prompts con prompt caching; ciclo 30 s (no 1 s); modelos haiku para tareas simples (Contador) |
| Rate limits Binance | Limiter en el MCP server; backoff exponencial; batch de decisiones |
| Regulatorio (tributario CL) | Fase futura: agente `Compliance` que registre operaciones para cálculo de impuestos |

---

## 14. Glosario

- **Scalping** — estrategia de micro-ganancias en timeframes cortos (segundos a minutos).
- **ATR** — Average True Range: medida de volatilidad usada para SL y sizing.
- **Drawdown (DD)** — caída porcentual desde el peak de equity.
- **R:R** — risk/reward ratio (ej. 2:1 significa TP a 2x ATR, SL a 1x ATR).
- **OCO** — One-Cancels-the-Other: combo de órdenes (SL + TP) donde ejecutar una cancela la otra.
- **Kill-switch** — mecanismo para detener toda operativa inmediatamente.
- **MCP** — Model Context Protocol: estándar abierto para exponer tools a LLMs.
- **Guardrail** — regla de seguridad aplicada en código que la IA no puede ignorar.

---

## 15. Referencias

- Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk
- MCP: https://modelcontextprotocol.io
- Binance Spot Testnet: https://testnet.binance.vision
- `@binance/connector-typescript`: https://github.com/binance/binance-connector-typescript
- Vercel AI SDK (alternativa futura para el dashboard): https://sdk.vercel.ai
