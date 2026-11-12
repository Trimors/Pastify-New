import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Housekeeping. Call daily with `Authorization: Bearer $CRON_SECRET`
 * (Vercel Cron does this automatically when CRON_SECRET is set).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now();
  const [pastes, unlocks, limits, sessions] = await Promise.all([
    // Expired pastes are kept 7 days so owners can still copy them, then deleted.
    db.paste.deleteMany({ where: { expiresAt: { lt: new Date(now - 7 * 864e5) } } }),
    db.unlockSession.deleteMany({ where: { createdAt: { lt: new Date(now - 2 * 864e5) } } }),
    db.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now) } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
  ]);
  return NextResponse.json({ deleted: { pastes: pastes.count, unlockSessions: unlocks.count, rateLimits: limits.count, sessions: sessions.count } });
}
