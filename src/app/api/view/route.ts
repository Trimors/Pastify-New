import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { clientIp, getUser } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";
import { recordView } from "@/lib/unlock";
import { classifyReferrer, visitor } from "@/lib/visitor";
import { SITE_HOST } from "@/lib/config";

/** View beacon for non-earning pastes (earning ones are logged by /api/unlock/start). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { slug?: string; referrer?: string };
  const ip = await clientIp();
  if (!(await rateLimit(`view:${ip}`, 120, 600))) return NextResponse.json({ ok: false }, { status: 429 });
  const p = body.slug ? await db.paste.findUnique({ where: { slug: String(body.slug) }, select: { id: true, userId: true, status: true } }) : null;
  if (!p || p.status !== "ACTIVE") return NextResponse.json({ ok: false }, { status: 404 });
  const host = (await headers()).get("host") || SITE_HOST;
  const user = await getUser();
  await recordView({ id: p.id, userId: p.userId, kind: "PASTE" }, await visitor(), classifyReferrer(body.referrer, host), user?.id ?? null);
  return NextResponse.json({ ok: true });
}
