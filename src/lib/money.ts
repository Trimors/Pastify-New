export const MICROS = 1_000_000;

/** Format micro-dollars. Small non-zero amounts get extra decimals so early earnings are visible. */
export function usd(micros: bigint | number, digits = 2): string {
  const n = Number(micros) / MICROS;
  const d = n !== 0 && Math.abs(n) < 1 ? Math.max(digits, 4) : digits;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: d, maximumFractionDigits: d });
}

export function usdToMicros(n: number): bigint {
  return BigInt(Math.round(n * MICROS));
}
