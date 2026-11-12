export function compact(n: number) {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

export function num(n: number) {
  return n.toLocaleString("en-US");
}

export function pct(n: number) {
  return `${(n * 100).toFixed(1)}%`;
}

export function shortDate(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function dayMonth(d: Date) {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function relTime(d: Date) {
  const s = Math.round((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  if (days < 30) return `${days}d ago`;
  return shortDate(d);
}

export function timeLeft(d: Date) {
  const s = Math.round((d.getTime() - Date.now()) / 1000);
  if (s <= 0) return "expired";
  const m = Math.floor(s / 60);
  if (m < 60) return `${Math.max(m, 1)}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
