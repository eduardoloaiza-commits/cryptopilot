---
name: technical-analysis
description: Metodología de análisis técnico para scalping cripto spot **long-only** — multi-timeframe, confirmaciones duras y criterios de descarte explícitos.
---

# Technical Analysis (spot, long-only)

## Principio

El sistema es **spot** — **solo LONG, nunca SHORT**. Si no hay momentum alcista claro, la decisión correcta es `[]` (stand aside). Un ciclo sin señal es MEJOR que un ciclo con señal débil.

## Flujo obligatorio por símbolo

1. **Filtro de régimen** (skill `market-regime`): mira BTC 1h + 4h antes de cualquier otra cosa. Si es `Bearish` u `Overextended`, retorna `[]` para TODOS los símbolos.
2. **Timeframe de contexto** (`1h`): el par debe tener EMA20 > EMA50 O RSI saliendo desde < 40 con divergencia. Si no, descarta.
3. **Timeframe de entrada** (`15m`): confirma momentum: EMA9 > EMA21, RSI ∈ (45, 65), Bollinger width expandiéndose.
4. **Timeframe fino** (`5m`): verifica precio **arriba** de la EMA20 5m y la última vela no cierra en el 80% superior del rango 20-velas (evita comprar tops).

**Señal solo si 3/3 timeframes (1h, 15m, 5m) coinciden en LONG**. Si solo 2/3 coinciden, confidence máxima 0.60 (no suficiente para threshold 0.65).

## Indicadores concretos

- **EMA** fast/slow: 9/21 en 5m–15m, 20/50 en 1h/4h.
- **RSI(14)**: zonas:
  - `<30`: oversold. NO es señal por sí solo — puede seguir bajando.
  - `30–45`: posible reversion, necesita confirmación de momentum (EMA cross + volumen).
  - `45–65`: zona óptima para entradas LONG.
  - `65–75`: late, exige pullback.
  - `>75`: sobrecomprado, stand aside.
- **Bollinger (20, 2σ)**: bandwidth > 0.5% (evita squeeze muerto); precio **arriba** del middle.
- **ATR(14) 5m**: debe estar entre `0.7×` y `2.5×` su ATR medio 30d. Fuera de ese rango: volatilidad anómala, stand aside.

## Criterio de descarte duro (cualquiera de estos → no hay señal)

- BTC en régimen `Bearish` u `Overextended`.
- ATR 5m `< 0.15%` del precio (mercado muerto: costo fee/slippage no se paga).
- Precio `< EMA20` en 5m Y `< EMA50` en 15m.
- RSI 5m `> 75` (sobrecomprado inmediato).
- Horario 00:00–04:00 UTC salvo BTC bullish claro.
- Vela 5m cerrada con body `> 2×` ATR (movimiento extremo, peligro reversión).

## SL y TP obligatorios en la señal

En cada objeto de señal, incluye `suggestedSL` y `suggestedTP` calculados así:

- `atr = valor de ATR(14) en 5m obtenido de compute_indicators`
- `suggestedSL = entryPrice − 1.5 × atr` (SL debajo)
- `suggestedTP = entryPrice + 3.0 × atr` (TP arriba — R:R 2:1 mínimo)

Si `atr` resulta en un SL más cercano de `0.3%` del precio, usa `suggestedSL = entryPrice × 0.997` (SL mínimo 0.3%). Si es más lejano de `2%`, usa `entryPrice × 0.98` (SL máximo 2%, evita riesgo desproporcionado).

## Confianza (0..1)

Empieza en `0.50`. Sumar:
- `+0.10` por cada timeframe (1h, 15m, 5m) que confirma LONG (máx `+0.30`).
- `+0.05` si volumen última vela 5m > 1.5× el promedio 20-velas.
- `+0.05` si Bollinger width 15m expandiendo (vs. la del cierre previo).

Restar:
- `−0.15` si RSI 5m > 70.
- `−0.15` si el símbolo aparece en `lostSymbols` del historial reciente.

**Emite la señal solo si `confidence ≥ 0.65`.** Si ninguna supera 0.65, el array devuelto es `[]`.

## Output

```jsonc
[{
  "symbol": "BTCUSDT",
  "direction": "LONG",           // literal — nunca SHORT
  "confidence": 0.72,            // >= 0.65 obligatorio
  "rationale": "Régimen: Bullish (BTC EMA20>EMA50 en 1h+4h, RSI 54). 3/3 TF alineados: 1h EMA20>EMA50, 15m momentum con RSI 58, 5m sobre EMA20. ATR5m 0.35%. Volumen última vela 1.8x promedio.",
  "indicators": { "rsi5m": 58, "rsi15m": 55, "rsi1h": 54, "atr5m": 0.0035, "bbwidth15m": 0.012 },
  "suggestedSL": 77200.0,
  "suggestedTP": 78100.0,
  "generatedAt": "2026-04-24T22:00:00Z"
}]
```
