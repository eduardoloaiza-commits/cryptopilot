---
name: accounting-ledger
description: Reglas contables — cómo registrar trades, movimientos, fees, y generar el DailyReport con explicabilidad.
---

# Accounting Ledger

## Movimientos (tabla inmutable)
Cada `Movement` es append-only. Tipos:
- `DEPOSIT` / `WITHDRAW`: aportes/retiros de capital desde el usuario.
- `TRADE_PNL`: P&L realizado al cerrar un trade (positivo o negativo).
- `FEE`: fees de trading o retiro reportadas por Binance.

Nunca actualices un Movement existente; si hay error, crea uno nuevo tipo `ADJUSTMENT` con rationale.

## Precisión
- Siempre `Decimal` (Prisma). Nunca `number`/`float`.
- Fees: si Binance reporta fee en el activo base, conviértelo a USDT usando el fill price del trade — regístralo en ambos campos (`feeAsset`, `feeUsdt`).

## DailyReport (cierre del día)
Incluye obligatoriamente:
1. Encabezado: fecha, mode, equity_inicio, equity_final, P&L absoluto y %.
2. Tabla de trades cerrados con: símbolo, side, entry/exit, qty, P&L neto.
3. Métricas: winrate, average win, average loss, profit factor, max drawdown intradía.
4. **Sección de transparencia**: señales del Analista que NO se tradearon y el motivo (veto del Risk, confianza baja, guardrail rechazó).
5. Reconciliación: saldo Binance vs DB; si divergencia > 1%, marcar en rojo.

Formato: markdown. El campo `summaryMd` en la tabla `DailyReport` guarda el markdown entero.
