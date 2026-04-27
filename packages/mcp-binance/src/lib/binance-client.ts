import { Spot } from "@binance/connector-typescript";

type Mode = "PAPER" | "TESTNET" | "LIVE";

function resolveMode(): Mode {
  const raw = (process.env.MODE ?? "PAPER").toUpperCase();
  if (raw === "TESTNET" || raw === "LIVE" || raw === "PAPER") return raw;
  throw new Error(`Invalid MODE: ${raw}`);
}

let cached: Spot | null = null;

export function getBinanceClient(): Spot {
  if (cached) return cached;

  const mode = resolveMode();
  // En PAPER las órdenes se simulan localmente (paper engine) — solo necesitamos
  // datos de mercado read-only. data-api.binance.vision es el espejo público de
  // mainnet con TODO el universo de símbolos. testnet tiene un subset limitado
  // (no incluye listings nuevos como CHIPUSDT), así que en PAPER esos símbolos
  // se nos rompían cada ciclo aunque el prefilter los considerara.
  // TESTNET → testnet real (para probar el flujo de órdenes signed con keys).
  // LIVE → producción.
  const defaultUrl =
    mode === "LIVE"
      ? "https://api.binance.com"
      : mode === "TESTNET"
        ? "https://testnet.binance.vision"
        : "https://data-api.binance.vision";
  const baseURL = process.env.BINANCE_BASE_URL ?? defaultUrl;

  cached = new Spot(
    process.env.BINANCE_API_KEY ?? "",
    process.env.BINANCE_SECRET ?? "",
    { baseURL },
  );
  return cached;
}

export function getMode(): Mode {
  return resolveMode();
}

let cachedData: Spot | null = null;

/**
 * Cliente READ-ONLY para datos de mercado (ticker/klines/indicators/volatilidad).
 * Apunta SIEMPRE al espejo público mainnet `data-api.binance.vision`,
 * independiente del MODE. Razón: testnet expone un subset chico de símbolos
 * (sin listings nuevos) — usar testnet acá rompe `compute_indicators` para
 * cualquier candidato que el prefilter levante de mainnet pero no exista en
 * testnet. La data es pública e idéntica a mainnet, no requiere keys, no
 * firma órdenes.
 *
 * Trading/portfolio (firma con keys) sí usa `getBinanceClient` con la URL
 * mode-specific (testnet o mainnet) para que los órdenes lleguen al endpoint
 * correcto.
 */
export function getBinanceDataClient(): Spot {
  if (cachedData) return cachedData;
  const baseURL =
    process.env.BINANCE_DATA_URL ?? "https://data-api.binance.vision";
  cachedData = new Spot("", "", { baseURL });
  return cachedData;
}
