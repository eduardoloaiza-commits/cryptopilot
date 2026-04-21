---
name: technical-analysis
description: Metodología de análisis técnico para scalping cripto spot — indicadores, timeframes y cruces de confirmación.
---

# Technical Analysis

## Timeframes
- **Ejecución:** 1m
- **Contexto corto:** 5m
- **Contexto medio:** 15m
- **Filtro macro:** 1h EMA-200 para no pelear la tendencia dominante

## Indicadores core
- **EMA fast/slow** (9/21 en 1m, 20/50 en 5m): cruces como disparador.
- **RSI (14)**: evitar entradas en extremos (> 75 compra, < 25 venta) salvo divergencia.
- **Bollinger Bands (20, 2σ)**: medir contracción/expansión — preferir entradas cuando las bandas empiezan a expandirse.
- **ATR (14)**: usar para sizing y SL (ver skill position-sizing).

## Cruce de confirmación (mínimo 2 de 3)
1. Momentum alineado: EMA fast > EMA slow para LONG (o inverso SHORT).
2. RSI en zona válida (30-70) o saliendo de extremo con divergencia.
3. Volatilidad en expansión (BB width creciente) y ATR dentro del rango 0.5x–2x de su media 30d.

## Evitar
- Eventos macro conocidos (FOMC, CPI) — consultar Researcher en fase 2.
- Horarios de baja liquidez: 00:00–03:00 UTC.
- Spread > 0.05% del precio.
