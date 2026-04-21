---
name: position-sizing
description: Cálculo de tamaño de posición basado en volatilidad (ATR) y equity, respetando maxPerTradePct.
---

# Position Sizing

## Regla principal (volatility-based)
```
riskPerTradeUsdt = equity * maxPerTradePct         // p.ej. equity=500, pct=0.02 → 10 USDT
stopDistance     = max(1 * ATR14_5m, price * 0.003) // nunca SL más cercano que 0.3%
qty              = riskPerTradeUsdt / stopDistance
notionalUsdt     = qty * price
```

## Restricciones duras
- `notionalUsdt <= maxPositionUsdt` (del Risk Manager)
- `qty` redondeada al `stepSize` del símbolo (consultar exchange info).
- `notionalUsdt >= minNotional` del símbolo (típicamente 10 USDT en Binance spot).

## SL y TP por defecto
- SL: `entry ± 1 * ATR14_5m` (según dirección).
- TP: `entry ± 2 * ATR14_5m` (R:R 2:1). Partial take-profit en 1x ATR si se agrega trailing.

## Correlación
No abrir dos posiciones del mismo lado sobre pares correlacionados (BTC/ETH suelen >0.8). Verifica con el Risk Manager.
