import { NextResponse } from "next/server";
import { handlePaddleEvent, verifyPaddleSignature } from "@/lib/premium";

/** Paddle Billing webhook. Point a notification destination at /api/paddle/webhook. */
export async function POST(req: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const raw = await req.text();
  if (!verifyPaddleSignature(raw, req.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }
  let evt: { event_id?: string; event_type?: string; data?: unknown };
  try {
    evt = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!evt.event_id || !evt.event_type) return NextResponse.json({ error: "bad_event" }, { status: 400 });
  try {
    const result = await handlePaddleEvent({ event_id: evt.event_id, event_type: evt.event_type, data: evt.data });
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("paddle webhook failed", evt.event_type, evt.event_id, e);
    // 500 makes Paddle retry later.
    return NextResponse.json({ error: "processing_failed" }, { status: 500 });
  }
}
