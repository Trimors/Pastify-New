import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export const PERIODS = [
  { id: "today", label: "Today", days: 1 },
  { id: "7d", label: "7 days", days: 7 },
  { id: "28d", label: "28 days", days: 28 },
  { id: "90d", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: 0 },
] as const;
export type PeriodId = (typeof PERIODS)[number]["id"];

export function periodStart(id: string): { since: Date | null; days: number } {
  const p = PERIODS.find((x) => x.id === id) ?? PERIODS[2];
  if (p.id === "today") {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return { since: d, days: 1 };
  }
  if (!p.days) return { since: null, days: 0 };
  const d = new Date(Date.now() - (p.days - 1) * 864e5);
  d.setUTCHours(0, 0, 0, 0);
  return { since: d, days: p.days };
}

export async function overview(ownerId: string, period: string) {
  const { since } = periodStart(period);
  const where: Prisma.ViewEventWhereInput = { ownerId, ...(since ? { createdAt: { gte: since } } : {}) };
  const [views, unlocks, earn] = await Promise.all([
    db.viewEvent.count({ where }),
    db.viewEvent.count({ where: { ...where, unlocked: true } }),
    db.viewEvent.aggregate({ where, _sum: { earningMicros: true } }),
  ]);
  const earnings = earn._sum.earningMicros ?? 0n;
  const e = Number(earnings);
  return {
    views,
    unlocks,
    earnings,
    unlockRate: views ? unlocks / views : 0,
    cpm: unlocks ? BigInt(Math.round((e / unlocks) * 1000)) : 0n,
    epv: views ? BigInt(Math.round(e / views)) : 0n,
  };
}

export type SeriesPoint = { day: string; views: number; unlocks: number; earnings: number };

export async function series(ownerId: string, period: string): Promise<SeriesPoint[]> {
  let { since, days } = periodStart(period);
  if (!since) {
    const first = await db.viewEvent.findFirst({ where: { ownerId }, orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    since = first ? new Date(first.createdAt) : new Date();
    since.setUTCHours(0, 0, 0, 0);
    days = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 864e5));
  }
  if (period === "today") {
    // hourly buckets for today
    const rows = await db.$queryRaw<{ b: Date; v: bigint; u: bigint; e: bigint | null }[]>`
      SELECT date_trunc('hour', "createdAt") AS b, count(*) AS v, count(*) FILTER (WHERE unlocked) AS u, sum("earningMicros") AS e
      FROM "ViewEvent" WHERE "ownerId" = ${ownerId} AND "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`;
    const map = new Map(rows.map((r) => [new Date(r.b).getUTCHours(), r]));
    return Array.from({ length: 24 }, (_, h) => {
      const r = map.get(h);
      return { day: `${String(h).padStart(2, "0")}:00`, views: Number(r?.v ?? 0), unlocks: Number(r?.u ?? 0), earnings: Number(r?.e ?? 0) };
    });
  }
  const rows = await db.$queryRaw<{ b: Date; v: bigint; u: bigint; e: bigint | null }[]>`
    SELECT date_trunc('day', "createdAt") AS b, count(*) AS v, count(*) FILTER (WHERE unlocked) AS u, sum("earningMicros") AS e
    FROM "ViewEvent" WHERE "ownerId" = ${ownerId} AND "createdAt" >= ${since} GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [new Date(r.b).toISOString().slice(0, 10), r]));
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(since!.getTime() + i * 864e5).toISOString().slice(0, 10);
    const r = map.get(d);
    return { day: d, views: Number(r?.v ?? 0), unlocks: Number(r?.u ?? 0), earnings: Number(r?.e ?? 0) };
  });
}

type Dim = "country" | "device" | "browser" | "source" | "referrerDomain" | "resourceId";

export async function breakdown(ownerId: string, period: string, dim: Dim, take = 8) {
  const { since } = periodStart(period);
  const rows = await db.viewEvent.groupBy({
    by: [dim],
    where: { ownerId, ...(since ? { createdAt: { gte: since } } : {}), ...(dim === "referrerDomain" ? { referrerDomain: { not: null } } : {}) },
    _count: { _all: true },
    _sum: { earningMicros: true },
    orderBy: { _count: { id: "desc" } },
    take,
  });
  return rows.map((r) => ({
    key: String((r as Record<string, unknown>)[dim] ?? "unknown"),
    views: r._count._all,
    earnings: r._sum.earningMicros ?? 0n,
  }));
}

/** Per-item counts for a period, used by the Vault "best performing" cards. */
export async function itemStats(ownerId: string, period: string) {
  const { since } = periodStart(period);
  const rows = await db.viewEvent.groupBy({
    by: ["resourceId", "kind"],
    where: { ownerId, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
    _sum: { earningMicros: true },
  });
  const unlockRows = await db.viewEvent.groupBy({
    by: ["resourceId"],
    where: { ownerId, unlocked: true, ...(since ? { createdAt: { gte: since } } : {}) },
    _count: { _all: true },
  });
  const unlocks = new Map(unlockRows.map((r) => [r.resourceId, r._count._all]));
  return rows.map((r) => ({
    id: r.resourceId,
    kind: r.kind,
    views: r._count._all,
    unlocks: unlocks.get(r.resourceId) ?? 0,
    earnings: r._sum.earningMicros ?? 0n,
  }));
}

/** 14-day daily view counts for many items at once (sparklines). */
export async function sparklines(ids: string[]) {
  if (!ids.length) return new Map<string, number[]>();
  const since = new Date(Date.now() - 13 * 864e5);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await db.$queryRaw<{ id: string; b: Date; v: bigint }[]>`
    SELECT "resourceId" AS id, date_trunc('day', "createdAt") AS b, count(*) AS v FROM "ViewEvent"
    WHERE "resourceId" IN (${Prisma.join(ids)}) AND "createdAt" >= ${since} GROUP BY 1, 2`;
  const out = new Map<string, number[]>();
  for (const id of ids) out.set(id, Array(14).fill(0));
  for (const r of rows) {
    const i = Math.round((new Date(r.b).getTime() - since.getTime()) / 864e5);
    const arr = out.get(r.id);
    if (arr && i >= 0 && i < 14) arr[i] = Number(r.v);
  }
  return out;
}
