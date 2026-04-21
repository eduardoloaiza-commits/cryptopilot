export const WHITELIST_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"] as const;
export type WhitelistSymbol = (typeof WHITELIST_SYMBOLS)[number];

export function assertWhitelisted(symbol: string): asserts symbol is WhitelistSymbol {
  if (!WHITELIST_SYMBOLS.includes(symbol as WhitelistSymbol)) {
    throw new Error(`Symbol ${symbol} is not in whitelist ${WHITELIST_SYMBOLS.join(", ")}`);
  }
}
