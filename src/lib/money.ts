export const MICROS = 1_000_000;

export function usd(micros: bigint | number, digits = 2): string {
  const n = Number(micros) / MICROS;
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: Math.max(digits, 2) });
}

export function usdToMicros(n: number): bigint {
  return BigInt(Math.round(n * MICROS));
}
