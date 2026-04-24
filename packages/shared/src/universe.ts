/**
 * Universo dinámico de pares tradeables.
 *
 * Consulta Binance 24h ticker stats, filtra por quote USDT + liquidez mínima
 * y retorna los top N por volumen 24h. Resultado cacheado in-memory por TTL.
 * Si la API falla, caemos al set core (BTC/ETH/SOL/BNB) para no romper el loop.
 */

interface Ticker24h {
  symbol: string;
  quoteVolume: string;
  priceChangePercent: string;
  lastPrice: string;
}

export interface UniverseEntry {
  symbol: string;
  quoteVolumeUsdt: number;
  priceChangePct: number;
  lastPrice: number;
}

const CORE_FALLBACK: UniverseEntry[] = [
  { symbol: "BTCUSDT", quoteVolumeUsdt: 0, priceChangePct: 0, lastPrice: 0 },
  { symbol: "ETHUSDT", quoteVolumeUsdt: 0, priceChangePct: 0, lastPrice: 0 },
  { symbol: "SOLUSDT", quoteVolumeUsdt: 0, priceChangePct: 0, lastPrice: 0 },
  { symbol: "BNBUSDT", quoteVolumeUsdt: 0, priceChangePct: 0, lastPrice: 0 },
];

/**
 * Filtramos pares de stablecoins (USDC, FDUSD, TUSD, etc.) porque no tienen
 * volatilidad para scalping. También evitamos los pares leveraged (UP/DOWN/BEAR/BULL).
 */
const STABLE_BASES = new Set([
  "USDC",
  "FDUSD",
  "TUSD",
  "BUSD",
  "DAI",
  "USDP",
  "USD1",
  "USDE",
  "RLUSD",
  "PYUSD",
  "EUR",
  "GBP",
  "TRY",
  "BRL",
  "ARS",
]);

function isTradeable(symbol: string): boolean {
  if (!symbol.endsWith("USDT")) return false;
  const base = symbol.slice(0, -4);
  if (STABLE_BASES.has(base)) return false;
  if (/(UP|DOWN|BEAR|BULL)USDT$/.test(symbol)) return false;
  return base.length >= 2 && /^[A-Z0-9]+$/.test(base);
}

interface CacheEntry {
  ts: number;
  data: UniverseEntry[];
}
let cache: CacheEntry | null = null;

export interface UniverseOptions {
  topN?: number;
  minQuoteVolumeUsdt?: number;
  ttlMs?: number;
  dataUrl?: string;
  mustInclude?: string[];
}

export async function getUniverse(opts: UniverseOptions = {}): Promise<UniverseEntry[]> {
  const topN = opts.topN ?? 30;
  const minVol = opts.minQuoteVolumeUsdt ?? 50_000_000;
  const ttlMs = opts.ttlMs ?? 60 * 60_000;
  const dataUrl = opts.dataUrl ?? process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";
  const mustInclude = opts.mustInclude ?? ["BTCUSDT"];

  if (cache && Date.now() - cache.ts < ttlMs) return cache.data;

  try {
    const res = await fetch(`${dataUrl}/api/v3/ticker/24hr`);
    if (!res.ok) throw new Error(`ticker/24hr HTTP ${res.status}`);
    const all = (await res.json()) as Ticker24h[];

    const usdt = all
      .filter((t) => isTradeable(t.symbol))
      .map((t) => ({
        symbol: t.symbol,
        quoteVolumeUsdt: Number(t.quoteVolume),
        priceChangePct: Number(t.priceChangePercent),
        lastPrice: Number(t.lastPrice),
      }))
      .filter((e) => e.quoteVolumeUsdt >= minVol)
      .sort((a, b) => b.quoteVolumeUsdt - a.quoteVolumeUsdt);

    const top = usdt.slice(0, topN);
    const symbols = new Set(top.map((e) => e.symbol));

    for (const sym of mustInclude) {
      if (!symbols.has(sym)) {
        const found = usdt.find((e) => e.symbol === sym);
        if (found) top.push(found);
      }
    }

    cache = { ts: Date.now(), data: top };
    return top;
  } catch {
    if (cache) return cache.data;
    return CORE_FALLBACK;
  }
}

export function getUniverseSymbols(universe: UniverseEntry[]): string[] {
  return universe.map((e) => e.symbol);
}

/** Útil para tests e inspección manual. */
export function _clearUniverseCache(): void {
  cache = null;
}
