import { RSI, EMA, BollingerBands, ATR, SMA } from "technicalindicators";

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

/**
 * Binance kline arrays come as `(string | number)[]` con índices fijos.
 * Los convertimos a objetos numéricos.
 */
export function parseKlines(raw: (string | number)[][]): Kline[] {
  return raw.map((k) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: Number(k[6]),
  }));
}

export interface IndicatorSnapshot {
  symbol: string;
  interval: string;
  closes: number[];
  lastPrice: number;
  ema9: number | null;
  ema21: number | null;
  rsi14: number | null;
  bb20: { upper: number; middle: number; lower: number; bandwidthPct: number } | null;
  atr14: number | null;
  atr14Pct: number | null;
  ema9Above21: boolean | null;
  rsiState: "oversold" | "neutral" | "overbought" | null;
  generatedAt: string;
}

export function computeIndicators(symbol: string, interval: string, klines: Kline[]): IndicatorSnapshot {
  const closes = klines.map((k) => k.close);
  const highs = klines.map((k) => k.high);
  const lows = klines.map((k) => k.low);
  const lastPrice = closes[closes.length - 1] ?? NaN;

  const ema9Series = EMA.calculate({ period: 9, values: closes });
  const ema21Series = EMA.calculate({ period: 21, values: closes });
  const rsiSeries = RSI.calculate({ period: 14, values: closes });
  const bbSeries = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
  const atrSeries = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });

  const ema9 = last(ema9Series);
  const ema21 = last(ema21Series);
  const rsi14 = last(rsiSeries);
  const bb = last(bbSeries);
  const atr14 = last(atrSeries);

  return {
    symbol,
    interval,
    closes: closes.slice(-20),
    lastPrice,
    ema9,
    ema21,
    rsi14,
    bb20:
      bb != null
        ? {
            upper: bb.upper,
            middle: bb.middle,
            lower: bb.lower,
            bandwidthPct: ((bb.upper - bb.lower) / bb.middle) * 100,
          }
        : null,
    atr14,
    atr14Pct: atr14 != null && lastPrice ? (atr14 / lastPrice) * 100 : null,
    ema9Above21: ema9 != null && ema21 != null ? ema9 > ema21 : null,
    rsiState:
      rsi14 == null ? null : rsi14 >= 70 ? "overbought" : rsi14 <= 30 ? "oversold" : "neutral",
    generatedAt: new Date().toISOString(),
  };
}

export interface VolatilityAnalysis {
  symbol: string;
  windowDays: number;
  samples: number;
  atr14Last: number | null;
  atr14AvgPct: number | null;
  dailyReturnStdPct: number | null;
  realizedVolAnnualizedPct: number | null;
  suggested: {
    maxPerTradePct: number;
    stopLossPct: number;
    takeProfitPct: number;
    dailyLossLimitPct: number;
    rationale: string;
  };
  generatedAt: string;
}

export function analyzeVolatility(symbol: string, dailyKlines: Kline[]): VolatilityAnalysis {
  const closes = dailyKlines.map((k) => k.close);
  const highs = dailyKlines.map((k) => k.high);
  const lows = dailyKlines.map((k) => k.low);

  const atrSeries = ATR.calculate({ period: 14, high: highs, low: lows, close: closes });
  const atr14Last = last(atrSeries);
  const atr14Avg = atrSeries.length > 0 ? avg(atrSeries) : null;
  const lastPrice = closes[closes.length - 1] ?? NaN;
  const atr14AvgPct = atr14Avg != null && lastPrice ? (atr14Avg / lastPrice) * 100 : null;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const curr = closes[i];
    if (prev != null && curr != null && prev > 0) returns.push((curr - prev) / prev);
  }
  const meanRet = returns.length > 0 ? avg(returns) : 0;
  const variance =
    returns.length > 1
      ? returns.reduce((acc, r) => acc + (r - meanRet) ** 2, 0) / (returns.length - 1)
      : null;
  const dailyStd = variance != null ? Math.sqrt(variance) : null;
  const dailyReturnStdPct = dailyStd != null ? dailyStd * 100 : null;
  const realizedVolAnnualizedPct = dailyStd != null ? dailyStd * Math.sqrt(365) * 100 : null;

  return {
    symbol,
    windowDays: dailyKlines.length,
    samples: returns.length,
    atr14Last,
    atr14AvgPct,
    dailyReturnStdPct,
    realizedVolAnnualizedPct,
    suggested: suggestGuardrails(atr14AvgPct, dailyReturnStdPct),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Heurística conservadora basada en volatilidad realizada.
 * Cuanto mayor la volatilidad → menor tamaño por trade y SL más amplio.
 */
function suggestGuardrails(
  atrPct: number | null,
  dailyStdPct: number | null,
): VolatilityAnalysis["suggested"] {
  const refPct = atrPct ?? dailyStdPct ?? 3;
  const maxPerTradePct = clamp(0.04 / refPct, 0.005, 0.03);
  const stopLossPct = clamp(refPct / 100, 0.005, 0.04);
  const takeProfitPct = stopLossPct * 2;
  const dailyLossLimitPct = clamp(refPct / 100 * 1.5, 0.02, 0.08);

  return {
    maxPerTradePct: round(maxPerTradePct, 4),
    stopLossPct: round(stopLossPct, 4),
    takeProfitPct: round(takeProfitPct, 4),
    dailyLossLimitPct: round(dailyLossLimitPct, 4),
    rationale: `Basado en ATR diario ~${refPct.toFixed(2)}% sobre ventana ${refPct === atrPct ? "(ATR)" : "(stddev)"}. Sizing inverso a volatilidad para mantener riesgo USDT ~constante.`,
  };
}

function last<T>(arr: T[]): T | null {
  return arr.length > 0 ? (arr[arr.length - 1] as T) : null;
}
function avg(arr: number[]): number {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}

export const _internal = { SMA }; // evita unused warning si ampliamos
