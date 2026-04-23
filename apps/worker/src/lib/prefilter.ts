import { logger } from "./logger.js";

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
const INTERVAL = "5m";
const LIMIT = 20;

interface Kline {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchKlines(symbol: string): Promise<Kline[]> {
  const baseUrl = process.env.BINANCE_BASE_URL ?? "https://testnet.binance.vision";
  const url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${INTERVAL}&limit=${LIMIT}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`klines ${symbol} ${res.status}`);
  const rows = (await res.json()) as unknown[][];
  return rows.map((r) => ({
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[5]),
  }));
}

interface SymbolSnapshot {
  symbol: string;
  lastPrice: number;
  rangePct: number;
  lastBodyPctOfAtr: number;
  rsi14: number;
  volumeZ: number;
  interesting: boolean;
  reasons: string[];
}

function computeAtr(klines: Kline[], period = 14): number {
  if (klines.length < 2) return 0;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const c = klines[i]!;
    const p = klines[i - 1]!;
    const tr = Math.max(
      c.high - c.low,
      Math.abs(c.high - p.close),
      Math.abs(c.low - p.close),
    );
    trs.push(tr);
  }
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

function computeRsi(klines: Kline[], period = 14): number {
  if (klines.length < period + 1) return 50;
  let gains = 0;
  let losses = 0;
  for (let i = klines.length - period; i < klines.length; i++) {
    const diff = klines[i]!.close - klines[i - 1]!.close;
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (gains + losses === 0) return 50;
  const rs = gains / (losses || 1e-9);
  return 100 - 100 / (1 + rs);
}

function volumeZScore(klines: Kline[]): number {
  const vols = klines.map((k) => k.volume);
  const mean = vols.reduce((a, b) => a + b, 0) / vols.length;
  const variance = vols.reduce((s, v) => s + (v - mean) ** 2, 0) / vols.length;
  const std = Math.sqrt(variance);
  const last = vols[vols.length - 1] ?? 0;
  return std > 0 ? (last - mean) / std : 0;
}

function analyseSymbol(symbol: string, klines: Kline[]): SymbolSnapshot {
  const last = klines[klines.length - 1]!;
  const highest = Math.max(...klines.map((k) => k.high));
  const lowest = Math.min(...klines.map((k) => k.low));
  const mean = klines.reduce((a, b) => a + b.close, 0) / klines.length;
  const rangePct = mean > 0 ? ((highest - lowest) / mean) * 100 : 0;

  const atr = computeAtr(klines);
  const lastBody = Math.abs(last.close - last.open);
  const lastBodyPctOfAtr = atr > 0 ? (lastBody / atr) * 100 : 0;

  const rsi = computeRsi(klines);
  const volZ = volumeZScore(klines);

  const reasons: string[] = [];
  if (rangePct > 0.35) reasons.push(`range ${rangePct.toFixed(2)}%`);
  if (lastBodyPctOfAtr > 80) reasons.push(`candle body ${lastBodyPctOfAtr.toFixed(0)}% ATR`);
  if (rsi < 40 || rsi > 60) reasons.push(`RSI ${rsi.toFixed(1)}`);
  if (volZ > 1.5) reasons.push(`vol z=${volZ.toFixed(1)}`);

  return {
    symbol,
    lastPrice: last.close,
    rangePct,
    lastBodyPctOfAtr,
    rsi14: rsi,
    volumeZ: volZ,
    interesting: reasons.length >= 1,
    reasons,
  };
}

export interface PrefilterResult {
  shouldRunAnalyst: boolean;
  candidates: string[];
  snapshots: SymbolSnapshot[];
  summary: string;
}

export async function runPrefilter(): Promise<PrefilterResult> {
  const snapshots: SymbolSnapshot[] = [];
  await Promise.all(
    SYMBOLS.map(async (sym) => {
      try {
        const klines = await fetchKlines(sym);
        snapshots.push(analyseSymbol(sym, klines));
      } catch (err) {
        logger.warn({ err, sym }, "prefilter.fetch.failed");
      }
    }),
  );

  const candidates = snapshots.filter((s) => s.interesting).map((s) => s.symbol);
  const shouldRunAnalyst = candidates.length > 0;

  const summary = shouldRunAnalyst
    ? snapshots
        .filter((s) => s.interesting)
        .map((s) => `${s.symbol}: ${s.reasons.join(", ")}`)
        .join(" | ")
    : `sin movimiento — mejor símbolo: ${snapshots
        .slice()
        .sort((a, b) => b.rangePct - a.rangePct)[0]
        ?.symbol} range ${snapshots
        .slice()
        .sort((a, b) => b.rangePct - a.rangePct)[0]
        ?.rangePct.toFixed(2)}%`;

  return { shouldRunAnalyst, candidates, snapshots, summary };
}
