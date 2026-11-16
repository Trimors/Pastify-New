import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp, getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { checkPow, checkViewToken, creditPasteView, PAID_VIEW_POW_BITS, recordView } from "@/lib/views";
import { classifyReferrer, visitor } from "@/lib/visitor";
import { SITE_HOST } from "@/lib/config";

/**
 * View beacon for pastes. Every view is counted for analytics. Views of earning pastes are
 * paid once the beacon proves the page was open long enough (signed token) and solves a
 * small background proof-of-work, so scripts can't farm views cheaply.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; referrer?: string; token?: string; nonce?: string };
  const ip = await clientIp();
  if (!(await rateLimit(`view:${ip}`, 120, 600))) return NextResponse.json({ ok: false }, { status: 429 });
  const p = body.slug ? await db.paste.findUnique({ where: { slug: String(body.slug) }, select: { id: true, userId: true, status: true, earning: true } }) : null;
  if (!p || p.status !== "ACTIVE") return NextResponse.json({ ok: false }, { status: 404 });

  const host = (await headers()).get("host") || SITE_HOST;
  const user = await getUser();
  const v = await visitor();
  const viewId = await recordView({ id: p.id, userId: p.userId }, v, classifyReferrer(body.referrer, host), user?.id ?? null);

  if (!p.earning || !viewId) return NextResponse.json({ ok: true, paid: false });
  const t = checkViewToken(p.id, String(body.token ?? ""));
  if (t !== "ok") return NextResponse.json({ ok: true, paid: false, reason: t });
  if (!body.nonce || !checkPow(String(body.token), String(body.nonce), PAID_VIEW_POW_BITS)) {
    return NextResponse.json({ ok: true, paid: false, reason: "challenge_failed" });
  }
  if (!(await rateLimit(`paidview:${ip}`, 60, 3600))) return NextResponse.json({ ok: true, paid: false, reason: "rate_limited" });
  const r = await creditPasteView(p.id, viewId, v, user?.id ?? null);
  return NextResponse.json({ ok: true, paid: r.credited });
}
