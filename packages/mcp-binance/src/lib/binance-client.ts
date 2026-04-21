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
  const baseURL =
    process.env.BINANCE_BASE_URL ??
    (mode === "LIVE" ? "https://api.binance.com" : "https://testnet.binance.vision");

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
