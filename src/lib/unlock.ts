import "server-only";
import { createHash } from "crypto";
import { Prisma, type ResourceKind } from "@prisma/client";
import { db } from "./db";
import { EARN, earningMicrosFor } from "./config";
import { token } from "./ids";
import type { VisitorInfo } from "./visitor";

export type Step = { kind: "view" | "sponsor" | "wait"; seconds: number; url?: string };

export const POW_BITS = 16;

function sponsorUrls() {
  return (process.env.SPONSOR_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function buildSteps(intensity: string, waitSeconds: number): Step[] {
  const sponsors = sponsorUrls();
  const pick = (i: number) => (sponsors.length ? sponsors[i % sponsors.length] : undefined);
  const steps: Step[] = [{ kind: "view", seconds: 6 }];
  if (intensity !== "light") steps.push({ kind: "sponsor", seconds: 8, url: pick(0) });
  if (intensity === "heavy") steps.push({ kind: "sponsor", seconds: 8, url: pick(1) });
  if (waitSeconds > 0) steps.push({ kind: "wait", seconds: Math.min(waitSeconds, 120) });
  return steps;
}

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

export async function verifyTurnstile(tokenStr: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return true;
  if (!tokenStr) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({ secret, response: tokenStr, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

type Resource = { id: string; userId: string | null; kind: ResourceKind };

/** Log a view, deduplicated per visitor for 30 minutes. Returns the view event id. */
export async function recordView(
  res: Resource,
  v: VisitorInfo,
  ref: { source: string; domain: string | null },
  viewerUserId: string | null,
) {
  if (v.isBot) return null;
  const since = new Date(Date.now() - 30 * 60e3);
  const recent = await db.viewEvent.findFirst({
    where: { resourceId: res.id, visitorHash: v.hash, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return recent.id;
  const isOwner = !!viewerUserId && viewerUserId === res.userId;
  const ev = await db.viewEvent.create({
    data: {
      kind: res.kind,
      resourceId: res.id,
      ownerId: res.userId,
      visitorHash: v.hash,
      country: v.country,
      device: v.device,
      browser: v.browser,
      source: ref.source,
      referrerDomain: ref.domain,
    },
  });
  if (!isOwner) {
    if (res.kind === "PASTE") await db.paste.update({ where: { id: res.id }, data: { views: { increment: 1 } } });
    else await db.locker.update({ where: { id: res.id }, data: { views: { increment: 1 } } });
  }
  return ev.id;
}

export async function startUnlock(res: Resource, steps: Step[], v: VisitorInfo, viewEventId: string | null) {
  return db.unlockSession.create({
    data: {
      kind: res.kind,
      resourceId: res.id,
      viewEventId,
      visitorHash: v.hash,
      steps: steps as unknown as Prisma.InputJsonValue,
      powSalt: token(12),
      powBits: POW_BITS,
    },
  });
}

/**
 * Called once every step is verified. Marks the unlock and credits the creator
 * (plus referrer) when the unlock is unique, human and not the owner.
 */
export async function completeUnlock(sessionId: string, v: VisitorInfo, viewerUserId: string | null) {
  const s = await db.unlockSession.findUnique({ where: { id: sessionId } });
  if (!s || s.completedAt) return { credited: false };
  await db.unlockSession.update({ where: { id: s.id }, data: { completedAt: new Date() } });

  const owner =
    s.kind === "PASTE"
      ? (await db.paste.findUnique({ where: { id: s.resourceId }, select: { userId: true, earning: true } }))
      : (await db.locker.findUnique({ where: { id: s.resourceId }, select: { userId: true } }));
  const ownerId = owner?.userId ?? null;
  const earningOn = s.kind === "LOCKER" || (owner && "earning" in owner && owner.earning);

  const since = new Date(Date.now() - EARN.uniqueWindowHours * 3600e3);
  const already = await db.viewEvent.findFirst({
    where: { resourceId: s.resourceId, visitorHash: v.hash, unlocked: true, createdAt: { gte: since } },
    select: { id: true },
  });

  let earning = 0n;
  let ownerUser = null;
  if (ownerId && earningOn && !already && !v.isBot && viewerUserId !== ownerId) {
    ownerUser = await db.user.findUnique({ where: { id: ownerId } });
    if (ownerUser?.status === "ACTIVE") earning = earningMicrosFor(v.country);
  }

  if (s.viewEventId) {
    await db.viewEvent.update({
      where: { id: s.viewEventId },
      data: { unlocked: true, unlockedAt: new Date(), earningMicros: earning },
    });
  }

  if (!already && viewerUserId !== ownerId) {
    if (s.kind === "PASTE") await db.paste.update({ where: { id: s.resourceId }, data: { unlocks: { increment: 1 } } });
    else await db.locker.update({ where: { id: s.resourceId }, data: { unlocks: { increment: 1 } } });
  }

  if (earning > 0n && ownerUser) {
    await db.ledgerEntry.create({
      data: { userId: ownerUser.id, type: "EARNING", amountMicros: earning, refId: s.viewEventId, note: v.country },
    });
    if (ownerUser.referredById) {
      const bonus = BigInt(Math.floor(Number(earning) * EARN.referralRate));
      if (bonus > 0n) {
        await db.ledgerEntry.create({
          data: { userId: ownerUser.referredById, type: "REFERRAL", amountMicros: bonus, refId: ownerUser.id },
        });
      }
    }
  }
  return { credited: earning > 0n };
}

export async function balanceOf(userId: string): Promise<bigint> {
  const agg = await db.ledgerEntry.aggregate({ where: { userId }, _sum: { amountMicros: true } });
  return agg._sum.amountMicros ?? 0n;
}
