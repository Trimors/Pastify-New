import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasGrant } from "@/lib/grant";

/** Sends unlocked visitors to the target. The target URL is never sent to a browser without a grant. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const l = await db.locker.findUnique({ where: { slug } });
  if (!l || l.status !== "ACTIVE") return NextResponse.redirect(new URL(`/l/${slug}`, req.url));
  const user = await getUser();
  if (user?.id !== l.userId && !(await hasGrant("u", l.id))) return NextResponse.redirect(new URL(`/l/${slug}`, req.url));
  let target = l.targetUrl;
  if (!/^https?:\/\//i.test(target)) target = "/";
  return NextResponse.redirect(target, 302);
}
