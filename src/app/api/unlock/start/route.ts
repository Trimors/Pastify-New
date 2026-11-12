import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientIp, getUser } from "@/lib/auth";
import { hasGrant } from "@/lib/grant";
import { rateLimit } from "@/lib/ratelimit";
import { findUnlockable } from "@/lib/resolve";
import { recordView, startUnlock } from "@/lib/unlock";
import { classifyReferrer, visitor } from "@/lib/visitor";
import { SITE_HOST } from "@/lib/config";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { kind?: string; slug?: string; referrer?: string };
  const res = await findUnlockable(String(body.kind), String(body.slug));
  if (!res) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (await hasGrant("u", res.id)) return NextResponse.json({ granted: true });

  const ip = await clientIp();
  if (!(await rateLimit(`ustart:${ip}`, 60, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const v = await visitor();
  const user = await getUser();
  const h = await headers();
  const host = h.get("host") || SITE_HOST;
  const ref = classifyReferrer(body.referrer || null, host);
  const viewId = await recordView(res, v, ref, user?.id ?? null);
  const s = await startUnlock(res, res.steps, v, viewId);

  return NextResponse.json({
    id: s.id,
    steps: res.steps.map((st) => ({ kind: st.kind, seconds: st.seconds, url: st.url ?? null })),
    pow: { salt: s.powSalt, bits: s.powBits },
  });
}
