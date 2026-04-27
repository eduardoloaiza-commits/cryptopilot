import { getUniverse, type UniverseEntry } from "@cryptopilot/shared";
import { logger } from "./logger.js";

const INTERVAL = "5m";
const LIMIT = 20;
const UNIVERSE_SIZE = Number(process.env.UNIVERSE_SIZE ?? 50);
const UNIVERSE_MIN_VOL = Number(process.env.UNIVERSE_MIN_VOLUME_USDT ?? 30_000_000);
const TOP_K = Number(process.env.PREFILTER_TOP_K ?? 8);
const MIN_SCORE = Number(process.env.PREFILTER_MIN_SCORE ?? 0.25);

interface Kline {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function fetchKlines(symbol: string): Promise<Kline[]> {
  const baseUrl = process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";
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

export interface SymbolSnapshot {
  symbol: string;
  lastPrice: number;
  quoteVolumeUsdt: number;
  priceChangePct24h: number;
  rangePct: number;
  lastBodyPctOfAtr: number;
  rsi14: number;
  volumeZ: number;
  score: number;
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

function clip01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function scoreSymbol(
  entry: UniverseEntry,
  klines: Kline[],
): SymbolSnapshot | null {
  if (klines.length < 15) return null;
  const last = klines[klines.length - 1]!;
  const highest = Math.max(...klines.map((k) => k.high));
  const lowest = Math.min(...klines.map((k) => k.low));
  const mean = klines.reduce((a, b) => a + b.close, 0) / klines.length;
  const rangePct = mean > 0 ? ((highest - lowest) / mean) * 100 : 0;

  const atr = computeAtr(klines);
  const atrPct = mean > 0 ? (atr / mean) * 100 : 0;
  const lastBody = Math.abs(last.close - last.open);
  const lastBodyPctOfAtr = atr > 0 ? (lastBody / atr) * 100 : 0;

  const rsi = computeRsi(klines);
  const volZ = volumeZScore(klines);

  // Descarte duro — ver skills/technical-analysis "Criterio de descarte"
  if (atrPct < 0.15) return null; // mercado muerto, el fee se come todo

  // Componentes normalizados [0,1]
  const rangeN = clip01(rangePct / 2); // 2% range → 1.0
  const bodyN = clip01(lastBodyPctOfAtr / 150); // body = 1.5x ATR → 1.0
  const rsiDistN = clip01(Math.abs(rsi - 50) / 30); // RSI lejos de 50 (momentum)
  const volN = clip01((volZ + 1) / 3); // volZ -1..2 → 0..1

  const score =
    0.35 * rangeN + 0.3 * volN + 0.2 * bodyN + 0.15 * rsiDistN;

  const reasons: string[] = [];
  if (rangePct > 0.5) reasons.push(`range ${rangePct.toFixed(2)}%`);
  if (lastBodyPctOfAtr > 80) reasons.push(`body ${lastBodyPctOfAtr.toFixed(0)}%ATR`);
  if (rsi < 35 || rsi > 65) reasons.push(`RSI ${rsi.toFixed(1)}`);
  if (volZ > 1.2) reasons.push(`vol z=${volZ.toFixed(1)}`);

  return {
    symbol: entry.symbol,
    lastPrice: last.close,
    quoteVolumeUsdt: entry.quoteVolumeUsdt,
    priceChangePct24h: entry.priceChangePct,
    rangePct,
    lastBodyPctOfAtr,
    rsi14: rsi,
    volumeZ: volZ,
    score,
    reasons,
  };
}

export interface PrefilterResult {
  shouldRunAnalyst: boolean;
  candidates: string[];
  snapshots: SymbolSnapshot[];
  universeSize: number;
  summary: string;
}

export async function runPrefilter(): Promise<PrefilterResult> {
  const universe = await getUniverse({
    topN: UNIVERSE_SIZE,
    minQuoteVolumeUsdt: UNIVERSE_MIN_VOL,
    mustInclude: ["BTCUSDT"],
  });

  const results = await Promise.all(
    universe.map(async (entry) => {
      try {
        const kl = await fetchKlines(entry.symbol);
        return scoreSymbol(entry, kl);
      } catch (err) {
        logger.debug({ err, sym: entry.symbol }, "prefilter.fetch.failed");
        return null;
      }
    }),
  );

  const snapshots = results.filter((s): s is SymbolSnapshot => s !== null);
  snapshots.sort((a, b) => b.score - a.score);

  const top = snapshots.slice(0, TOP_K);

  // Umbral de "hay oportunidad" — env-overridable. Score mínimo bajo permite
  // que el analyst LLM evalúe más candidatos (él tiene la última palabra y
  // descarta los que no clasifican). Score muy alto = mercado calmo deja al
  // sistema sin nada que mirar.
  const worthRunning = top.filter((s) => s.score >= MIN_SCORE);
  const candidates = worthRunning.map((s) => s.symbol);

  const summary = worthRunning.length
    ? worthRunning
        .slice(0, 5)
        .map((s) => `${s.symbol} s=${s.score.toFixed(2)} ${s.reasons.join("/")}`)
        .join(" | ")
    : `sin oportunidades — top ${snapshots[0]?.symbol ?? "n/a"} score ${snapshots[0]?.score?.toFixed(2) ?? "n/a"}`;

  return {
    shouldRunAnalyst: worthRunning.length > 0,
    candidates,
    snapshots: top,
    universeSize: universe.length,
    summary,
  };
}
