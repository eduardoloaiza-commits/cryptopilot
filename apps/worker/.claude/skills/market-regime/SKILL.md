---
name: market-regime
description: Clasifica el estado del mercado (BTC como anchor) para decidir si operar long-only, stand-aside, o reducir tamaño. Consúltalo ANTES de emitir cualquier señal.
---

# Market Regime Filter

En un bot **spot-only** no se puede hacer short. Cuando BTC está bajista, las altcoins (ETH/SOL/BNB) **casi siempre** caen más — operar LONG ahí tiene expected value negativo. La skill fuerza al analista a respetar el régimen del mercado.

## Regla de oro

Consulta `compute_indicators("BTCUSDT", "1h")` y `compute_indicators("BTCUSDT", "4h")` **antes** de mirar los otros pares. Clasifica en uno de 4 regímenes:

| Régimen | Condición (BTC 1h + 4h) | Política |
|---|---|---|
| **Bullish** | EMA20 > EMA50 en 1h y 4h; RSI 1h ∈ (45, 70) | Operar LONG con threshold ≥ 0.60 |
| **Rangebound / Consolidation** | EMA20 ≈ EMA50 (diferencia < 0.3%); RSI 1h ∈ (40, 60); Bollinger width contraído | Operar LONG solo si confidence ≥ 0.70 y hay breakout con volumen |
| **Bearish** | EMA20 < EMA50 en 1h **y** 4h; RSI 1h < 50 | **STAND ASIDE** — retorna `[]`. En spot no se puede short. |
| **Overextended** | RSI 1h > 75 o precio > 3% sobre EMA20 1h | Evita comprar arriba. Retorna `[]` salvo pullback claro. |

## Altcoins vs BTC

- Si BTC está en **Bearish**, las altcoins **nunca** son buena compra — incluso si su RSI local dice "oversold". Stand aside.
- Si BTC está en **Bullish** pero una altcoin está en downtrend propio (EMA20 15m < EMA50 15m por 1h+), no la operes: compra líderes.
- Si BTC en **Bullish** y todas las altcoins también → elige la de mayor momentum relativo (comparar % cambio 1h).

## Horario

En UTC:
- 00:00–04:00: liquidez baja, spreads amplios — evitar salvo régimen Bullish claro.
- 13:00–16:00: apertura US, suele haber movimiento direccional.
- Evitar 15 min antes y después de velas de 4h si no hay tesis previa.

## Output obligatorio en rationale

Cada señal debe empezar su `rationale` con el régimen detectado:
> "Régimen: Bullish (BTC EMA20>EMA50 en 1h+4h, RSI 52). …"

Si no se cumple el régimen, no emitas señal. No fuerces operaciones por FOMO.
