import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clientIp, getUser } from "@/lib/auth";
import { setGrant } from "@/lib/grant";
import { checkPow, completeUnlock, verifyTurnstile, type Step } from "@/lib/unlock";
import { visitor } from "@/lib/visitor";
import { rateLimit } from "@/lib/ratelimit";

const TOLERANCE_MS = 750;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { id?: string; index?: number; nonce?: string; turnstile?: string };
  const ip = await clientIp();
  if (!(await rateLimit(`ustep:${ip}`, 120, 600))) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const s = body.id ? await db.unlockSession.findUnique({ where: { id: body.id } }) : null;
  const v = await visitor();
  if (!s || s.visitorHash !== v.hash || s.completedAt) return NextResponse.json({ error: "expired" }, { status: 410 });
  if (Date.now() - s.createdAt.getTime() > 60 * 60e3) return NextResponse.json({ error: "expired" }, { status: 410 });
  if (v.isBot) return NextResponse.json({ error: "blocked" }, { status: 403 });

  const steps = s.steps as unknown as Step[];
  if (body.index !== s.stepIndex) return NextResponse.json({ error: "out_of_order", index: s.stepIndex }, { status: 409 });

  if (!s.powSolved) {
    if (!body.nonce || !checkPow(s.powSalt, String(body.nonce), s.powBits)) return NextResponse.json({ error: "challenge_failed" }, { status: 400 });
    if (!(await verifyTurnstile(body.turnstile, ip))) return NextResponse.json({ error: "captcha_failed" }, { status: 400 });
  }

  const step = steps[s.stepIndex];
  const elapsed = Date.now() - s.stepStarted.getTime();
  const needed = step.seconds * 1000 - TOLERANCE_MS;
  if (elapsed < needed) return NextResponse.json({ error: "too_early", waitMs: needed - elapsed }, { status: 425 });

  const nextIndex = s.stepIndex + 1;
  // Optimistic lock so two parallel requests cannot both advance the same step.
  const updated = await db.unlockSession.updateMany({
    where: { id: s.id, stepIndex: s.stepIndex },
    data: { stepIndex: nextIndex, stepStarted: new Date(), powSolved: true },
  });
  if (updated.count === 0) return NextResponse.json({ error: "out_of_order" }, { status: 409 });

  if (nextIndex < steps.length) return NextResponse.json({ ok: true, index: nextIndex });

  const user = await getUser();
  await completeUnlock(s.id, v, user?.id ?? null);
  await setGrant("u", s.resourceId);
  return NextResponse.json({ ok: true, done: true });
}
