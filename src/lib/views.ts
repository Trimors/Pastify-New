import "server-only";
import { createHash } from "crypto";
import { db } from "./db";
import { EARN, earningMicrosFor } from "./config";
import type { VisitorInfo } from "./visitor";

/** Leading zero bits of sha256(salt + ":" + nonce) must be >= bits. */
export function checkPow(salt: string, nonce: string, bits: number) {
  const digest = createHash("sha256").update(`${salt}:${nonce}`).digest();
  let zeros = 0;
  for (const byte of digest) {
    if (byte === 0) {
      zeros += 8;
      continue;
    }
    zeros += Math.clz32(byte) - 24;
    break;
  }
  return zeros >= bits;
}

/** Log a paste view, deduplicated per visitor for 30 minutes. Returns the view event id. */
export async function recordView(
  paste: { id: string; userId: string | null },
  v: VisitorInfo,
  ref: { source: string; domain: string | null },
  viewerUserId: string | null,
) {
  if (v.isBot) return null;
  const since = new Date(Date.now() - 30 * 60e3);
  const recent = await db.viewEvent.findFirst({
    where: { resourceId: paste.id, visitorHash: v.hash, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return recent.id;
  const ev = await db.viewEvent.create({
    data: {
      kind: "PASTE",
      resourceId: paste.id,
      ownerId: paste.userId,
      visitorHash: v.hash,
      country: v.country,
      device: v.device,
      browser: v.browser,
      source: ref.source,
      referrerDomain: ref.domain,
    },
  });
  if (!viewerUserId || viewerUserId !== paste.userId) {
    await db.paste.update({ where: { id: paste.id }, data: { views: { increment: 1 } } });
  }
  return ev.id;
}

/**
 * Earning pastes open straight away and pay per unique view. Called by the view beacon
 * once the visitor has had the page open for a few seconds and passed the silent check.
 * Marks the view as paid ("unlocked" in the data model) and credits the creator and referrer.
 */
export async function creditPasteView(pasteId: string, viewEventId: string, v: VisitorInfo, viewerUserId: string | null) {
  const p = await db.paste.findUnique({ where: { id: pasteId }, select: { userId: true, earning: true, status: true } });
  if (!p?.userId || !p.earning || p.status !== "ACTIVE" || v.isBot || viewerUserId === p.userId) return { credited: false };

  const since = new Date(Date.now() - EARN.uniqueWindowHours * 3600e3);
  const already = await db.viewEvent.findFirst({
    where: { resourceId: pasteId, visitorHash: v.hash, unlocked: true, createdAt: { gte: since } },
    select: { id: true },
  });
  if (already) return { credited: false };

  const owner = await db.user.findUnique({ where: { id: p.userId } });
  const earning = owner?.status === "ACTIVE" ? earningMicrosFor(v.country) : 0n;

  // Only one request can turn this view event into a paid view.
  const marked = await db.viewEvent.updateMany({
    where: { id: viewEventId, resourceId: pasteId, unlocked: false },
    data: { unlocked: true, unlockedAt: new Date(), earningMicros: earning },
  });
  if (marked.count === 0) return { credited: false };
  await db.paste.update({ where: { id: pasteId }, data: { unlocks: { increment: 1 } } });

  if (earning > 0n && owner) {
    await db.ledgerEntry.create({ data: { userId: owner.id, type: "EARNING", amountMicros: earning, refId: viewEventId, note: v.country } });
    if (owner.referredById) {
      const bonus = BigInt(Math.floor(Number(earning) * EARN.referralRate));
      if (bonus > 0n) await db.ledgerEntry.create({ data: { userId: owner.referredById, type: "REFERRAL", amountMicros: bonus, refId: owner.id } });
    }
  }
  return { credited: earning > 0n };
}

/** Signed token rendered into an earning paste page; the view beacon must return it after a minimum time. */
export const PAID_VIEW_MIN_SECONDS = 5;
export const PAID_VIEW_POW_BITS = 14;

export function viewToken(pasteId: string) {
  const ts = Date.now();
  const sig = createHash("sha256").update(`${process.env.AUTH_SECRET}|view|${pasteId}|${ts}`).digest("base64url").slice(0, 32);
  return `${ts}.${sig}`;
}

export function checkViewToken(pasteId: string, token: string) {
  const [tsStr, sig] = String(token).split(".");
  const ts = Number(tsStr);
  if (!ts || !sig) return "invalid";
  const expected = createHash("sha256").update(`${process.env.AUTH_SECRET}|view|${pasteId}|${ts}`).digest("base64url").slice(0, 32);
  if (expected !== sig) return "invalid";
  const age = Date.now() - ts;
  if (age < PAID_VIEW_MIN_SECONDS * 1000 - 500) return "too_early";
  if (age > 6 * 3600e3) return "expired";
  return "ok";
}

export async function balanceOf(userId: string): Promise<bigint> {
  const agg = await db.ledgerEntry.aggregate({ where: { userId }, _sum: { amountMicros: true } });
  return agg._sum.amountMicros ?? 0n;
}
