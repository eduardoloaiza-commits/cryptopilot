import { getUniverse } from "@cryptopilot/shared";

/**
 * Whitelist dinámica: cualquier par USDT que esté en el universo actual
 * (top-N por volumen 24h, ver `shared/universe.ts`) es tradeable.
 */
export async function isWhitelisted(symbol: string): Promise<boolean> {
  if (!/^[A-Z0-9]+USDT$/.test(symbol)) return false;
  try {
    const universe = await getUniverse();
    return universe.some((e) => e.symbol === symbol);
  } catch {
    return false;
  }
}

export async function assertWhitelistedAsync(symbol: string): Promise<void> {
  if (!(await isWhitelisted(symbol))) {
    throw new Error(
      `Symbol ${symbol} is not in the current USDT-quote universe (top-N by 24h volume).`,
    );
  }
}

/** @deprecated Guard sincrónico básico de formato. Usar `assertWhitelistedAsync` para validar universo. */
export function assertWhitelisted(symbol: string): void {
  if (!/^[A-Z0-9]+USDT$/.test(symbol)) {
    throw new Error(`Symbol ${symbol} must be <BASE>USDT with uppercase alphanumerics`);
  }
}
