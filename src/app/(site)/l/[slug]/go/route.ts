import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasGrant } from "@/lib/grant";
import { isPremium } from "@/lib/premium";

/**
 * Sends unlocked visitors to the target. The target URL is never sent to a browser without a grant.
 * ?d={code} picks one of the locker's extra destinations.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = new URL(req.url).searchParams.get("d");
  const back = new URL(`/l/${slug}${d ? `?d=${encodeURIComponent(d)}` : ""}`, req.url);
  const l = await db.locker.findUnique({ where: { slug } });
  if (!l || l.status !== "ACTIVE") return NextResponse.redirect(back);
  const user = await getUser();
  if (user?.id !== l.userId && !isPremium(user) && !(await hasGrant("u", l.id))) return NextResponse.redirect(back);
  let target = l.targetUrl;
  if (d) {
    const t = await db.lockerTarget.findFirst({ where: { code: d, lockerId: l.id }, select: { url: true } });
    if (t) target = t.url;
  }
  if (!/^https?:\/\//i.test(target)) target = "/";
  return NextResponse.redirect(target, 302);
}
