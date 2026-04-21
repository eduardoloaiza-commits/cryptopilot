---
name: risk-management
description: Reglas de protección de capital — drawdown diario, exposición máxima, condiciones para kill-switch y ajustes dinámicos.
---

# Risk Management

## Límites duros (los aplica código, no prompt)
- **Max por trade:** `equity * maxPerTradePct` (default 2%).
- **Stop-loss obligatorio** en cada orden de entrada.
- **Pérdida diaria máxima:** `equity_inicio_día * dailyLossLimitPct` (default 5%). Al tocarlo → kill-switch.
- **Max posiciones abiertas simultáneas:** 3.
- **Whitelist símbolos:** BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT.

## Checks pre-cycle
1. `dailyPnl <= -dailyLossBudget` → veto + kill-switch.
2. `openPositions >= 3` → veto "esperar a que cierre alguna".
3. Volatilidad anómala (ATR 5m > 3x su mediana 30d) → veto "mercado demasiado caótico".

## Checks pre-execution
1. Notional propuesto ≤ `maxPositionUsdt`.
2. SL presente y distancia ≥ 0.3% del precio.
3. No duplicar dirección en pares correlacionados (BTC↔ETH: ρ>0.8).
4. Margen entre el SL y el precio actual consistente con el ATR.

## Trailing (sweep cada 15m)
- Si unrealized P&L ≥ 1x ATR → mover SL a break-even.
- Si ≥ 2x ATR → trailing stop a 1x ATR detrás del máximo favorable.

## Escalación
- Divergencia DB vs Binance > 1% → pausar, escribir AgentLog WARN, notificar dashboard.
- 3 trades consecutivos perdedores → reducir `maxPerTradePct` a la mitad durante 2h.
