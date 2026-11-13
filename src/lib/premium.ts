import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "./db";

/**
 * Visitor Premium, sold through Paddle (Billing v2).
 * Prices shown here must match the prices set up in Paddle.
 */
export const PLANS = [
  { id: "monthly", label: "1 month", perMonth: 9.99, billed: 9.99, every: "month", priceEnv: "PADDLE_PRICE_MONTHLY" },
  { id: "quarterly", label: "3 months", perMonth: 6.99, billed: 20.97, every: "3 months", priceEnv: "PADDLE_PRICE_QUARTERLY" },
  { id: "yearly", label: "12 months", perMonth: 2.99, billed: 35.88, every: "year", priceEnv: "PADDLE_PRICE_YEARLY" },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];

/** Creator share of what Pastify receives (after tax and Paddle's fee). */
export const SHARE = { basePct: 50, boostedPct: 70, boostFromSaleOfDay: 6 } as const;

export function paddleReady() {
  return !!(
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
    process.env.PADDLE_WEBHOOK_SECRET &&
    PLANS.every((p) => process.env[p.priceEnv])
  );
}

export function priceIdFor(plan: PlanId) {
  const p = PLANS.find((x) => x.id === plan);
  return p ? process.env[p.priceEnv] ?? null : null;
}

export function planForPrice(priceId: string | undefined | null): PlanId | null {
  if (!priceId) return null;
  return PLANS.find((p) => process.env[p.priceEnv] === priceId)?.id ?? null;
}

export function isPremium(u: { premiumUntil: Date | null } | null | undefined) {
  return !!u?.premiumUntil && u.premiumUntil > new Date();
}

/* ------------------------------------------------------------------ */
/* Attribution: which creator gets the sale. Signed so buyers can't   */
/* point the share at themselves by editing the checkout data.        */
/* ------------------------------------------------------------------ */

function sign(s: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev").update(`premium:${s}`).digest("base64url");
}

export function signCheckout(buyerId: string, creatorId: string | null) {
  const exp = Date.now() + 2 * 3600e3;
  const payload = `${buyerId}.${creatorId ?? ""}.${exp}`;
  return { buyerId, creatorId: creatorId ?? "", exp: String(exp), sig: sign(payload) };
}

export function verifyCheckout(cd: unknown): { buyerId: string; creatorId: string | null } | null {
  if (!cd || typeof cd !== "object") return null;
  const { buyerId, creatorId, exp, sig } = cd as Record<string, string>;
  if (!buyerId || !exp || !sig) return null;
  // exp only limits how long a checkout link can be reused; renewals use the stored subscription.
  const expected = Buffer.from(sign(`${buyerId}.${creatorId ?? ""}.${exp}`));
  const got = Buffer.from(String(sig));
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
  return { buyerId, creatorId: creatorId || null };
}

/** Resolve "via" (paste:slug / locker:slug) or a referral code to the creator's user id. */
export async function resolveCreator(via?: string | null, ref?: string | null, buyerId?: string | null) {
  let creatorId: string | null = null;
  if (via) {
    const [kind, slug] = via.split(":");
    if (kind === "paste" && slug) creatorId = (await db.paste.findUnique({ where: { slug }, select: { userId: true } }))?.userId ?? null;
    if (kind === "locker" && slug) creatorId = (await db.locker.findUnique({ where: { slug }, select: { userId: true } }))?.userId ?? null;
  }
  if (!creatorId && ref && /^[a-z0-9]{3,32}$/.test(ref)) {
    creatorId = (await db.user.findUnique({ where: { referralCode: ref }, select: { id: true } }))?.id ?? null;
  }
  if (creatorId && creatorId === buyerId) return null; // no self-commission
  if (creatorId) {
    const c = await db.user.findUnique({ where: { id: creatorId }, select: { status: true } });
    if (c?.status !== "ACTIVE") return null;
  }
  return creatorId;
}

/* ------------------------------------------------------------------ */
/* Webhook handling                                                   */
/* ------------------------------------------------------------------ */

/** Paddle-Signature: "ts=…;h1=…", HMAC-SHA256 of `${ts}:${rawBody}`. */
export function verifyPaddleSignature(raw: string, header: string | null, secret: string, toleranceSec = 300) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(";").map((kv) => kv.split("=") as [string, string]));
  const ts = Number(parts.ts);
  if (!ts || Math.abs(Date.now() / 1000 - ts) > toleranceSec) return false;
  const expected = createHmac("sha256", secret).update(`${parts.ts}:${raw}`).digest("hex");
  const h1s = header.split(";").filter((kv) => kv.startsWith("h1=")).map((kv) => kv.slice(3));
  return h1s.some((h) => h.length === expected.length && timingSafeEqual(Buffer.from(h), Buffer.from(expected)));
}

type Money = { total?: string; tax?: string; fee?: string; earnings?: string; subtotal?: string; currency_code?: string };

/** Net amount Pastify receives in USD cents, or null when it isn't in USD. */
function netUsdCents(details: { totals?: Money; payout_totals?: Money } | undefined) {
  const p = details?.payout_totals;
  if (p?.currency_code === "USD" && p.earnings) return Number(p.earnings);
  const t = details?.totals;
  if (t?.currency_code === "USD" && t.earnings) return Number(t.earnings);
  return null;
}

async function salesTodayFor(creatorId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return db.premiumSale.count({ where: { creatorId, createdAt: { gte: start } } });
}

async function setPremiumUntil(userId: string, until: Date | null) {
  await db.user.update({ where: { id: userId }, data: { premiumUntil: until } });
}

type SubData = {
  id: string;
  status: string;
  customer_id?: string;
  custom_data?: unknown;
  items?: { price?: { id?: string } }[];
  current_billing_period?: { ends_at?: string } | null;
  scheduled_change?: { action?: string; effective_at?: string } | null;
};

async function upsertSubscription(d: SubData) {
  const existing = await db.subscription.findUnique({ where: { id: d.id } });
  const attr = verifyCheckout(d.custom_data);
  const userId = existing?.userId ?? attr?.buyerId;
  if (!userId || !(await db.user.findUnique({ where: { id: userId }, select: { id: true } }))) return null;
  const plan = planForPrice(d.items?.[0]?.price?.id) ?? existing?.plan ?? "unknown";
  const periodEnd = d.current_billing_period?.ends_at ? new Date(d.current_billing_period.ends_at) : existing?.currentPeriodEnd ?? null;
  const cancelAt = d.scheduled_change?.action === "cancel" && d.scheduled_change.effective_at ? new Date(d.scheduled_change.effective_at) : null;
  const sub = await db.subscription.upsert({
    where: { id: d.id },
    create: { id: d.id, userId, creatorId: attr?.creatorId ?? null, paddleCustomerId: d.customer_id ?? null, plan, status: d.status, currentPeriodEnd: periodEnd, cancelAt },
    update: { status: d.status, plan, currentPeriodEnd: periodEnd, cancelAt, paddleCustomerId: d.customer_id ?? existing?.paddleCustomerId ?? null },
  });
  // Access: active/trialing/past_due keep Premium until the paid period ends.
  if (["active", "trialing", "past_due"].includes(d.status) && periodEnd) await setPremiumUntil(userId, periodEnd);
  if (["canceled", "paused"].includes(d.status)) {
    const other = await db.subscription.findFirst({ where: { userId, id: { not: d.id }, status: { in: ["active", "trialing", "past_due"] } } });
    if (!other) await setPremiumUntil(userId, periodEnd && periodEnd > new Date() ? periodEnd : new Date());
  }
  return sub;
}

type TxnData = {
  id: string;
  status: string;
  origin?: string;
  subscription_id?: string | null;
  customer_id?: string;
  custom_data?: unknown;
  items?: { price?: { id?: string } }[];
  details?: { totals?: Money; payout_totals?: Money };
  billing_period?: { ends_at?: string } | null;
};

async function recordSale(t: TxnData) {
  if (await db.premiumSale.findUnique({ where: { id: t.id } })) return { skipped: "duplicate" };
  let sub = t.subscription_id ? await db.subscription.findUnique({ where: { id: t.subscription_id } }) : null;
  const attr = verifyCheckout(t.custom_data);
  if (!sub && t.subscription_id && attr) {
    sub = await upsertSubscription({ id: t.subscription_id, status: "active", customer_id: t.customer_id, custom_data: t.custom_data, items: t.items, current_billing_period: t.billing_period });
  }
  const buyerId = sub?.userId ?? attr?.buyerId ?? null;
  const creatorId = sub?.creatorId ?? attr?.creatorId ?? null;
  const plan = planForPrice(t.items?.[0]?.price?.id) ?? sub?.plan ?? "unknown";
  const total = t.details?.totals;
  const gross = Number(total?.total ?? 0);
  const net = netUsdCents(t.details);

  let sharePct = 0;
  let shareMicros = 0n;
  if (creatorId && net !== null && net > 0) {
    const nth = (await salesTodayFor(creatorId)) + 1;
    sharePct = nth >= SHARE.boostFromSaleOfDay ? SHARE.boostedPct : SHARE.basePct;
    shareMicros = BigInt(Math.floor((net * 10_000 * sharePct) / 100)); // cents → micros
  }

  await db.$transaction(async (tx) => {
    await tx.premiumSale.create({
      data: {
        id: t.id,
        subscriptionId: t.subscription_id ?? null,
        buyerId,
        creatorId,
        plan,
        renewal: t.origin === "subscription_recurring",
        currency: total?.currency_code ?? "USD",
        grossCents: gross,
        netCents: net ?? 0,
        sharePct,
        shareMicros,
      },
    });
    if (creatorId && shareMicros > 0n) {
      await tx.ledgerEntry.create({ data: { userId: creatorId, type: "PREMIUM_SALE", amountMicros: shareMicros, refId: t.id, note: `${plan} · ${sharePct}%` } });
    }
  });
  if (buyerId && t.billing_period?.ends_at) {
    const end = new Date(t.billing_period.ends_at);
    const u = await db.user.findUnique({ where: { id: buyerId }, select: { premiumUntil: true } });
    if (!u?.premiumUntil || u.premiumUntil < end) await setPremiumUntil(buyerId, end);
  }
  return { creatorId, sharePct, net };
}

type AdjData = { id: string; action: string; status: string; transaction_id: string; totals?: { total?: string } };

/** Refunds and chargebacks take the creator's share back in proportion. */
async function recordAdjustment(a: AdjData) {
  if (!["refund", "chargeback", "chargeback_warning"].includes(a.action) || a.status !== "approved") return { skipped: "not a final refund" };
  if (a.action === "chargeback_warning") return { skipped: "warning only" };
  const sale = await db.premiumSale.findUnique({ where: { id: a.transaction_id } });
  if (!sale || !sale.creatorId || sale.shareMicros === 0n || !sale.grossCents) return { skipped: "no share" };
  const ratio = Math.min(1, Number(a.totals?.total ?? 0) / sale.grossCents);
  let take = BigInt(Math.floor(Number(sale.shareMicros) * ratio));
  const left = sale.shareMicros - sale.refundedMicros;
  if (take > left) take = left;
  if (take <= 0n) return { skipped: "already reversed" };
  await db.$transaction([
    db.premiumSale.update({ where: { id: sale.id }, data: { refundedMicros: { increment: take } } }),
    db.ledgerEntry.create({ data: { userId: sale.creatorId, type: "PREMIUM_REFUND", amountMicros: -take, refId: a.id, note: a.action } }),
  ]);
  // A full refund also ends the buyer's access.
  if (ratio >= 1 && sale.buyerId) await setPremiumUntil(sale.buyerId, new Date());
  return { reversed: Number(take) };
}

export async function handlePaddleEvent(evt: { event_id: string; event_type: string; data: unknown }) {
  const seen = await db.webhookEvent.findUnique({ where: { id: evt.event_id } });
  if (seen) return { skipped: "already processed" };
  let result: unknown = { ignored: true };
  const t = evt.event_type;
  if (t === "transaction.completed") result = await recordSale(evt.data as TxnData);
  else if (t.startsWith("subscription.")) result = (await upsertSubscription(evt.data as SubData)) ? { ok: true } : { skipped: "unknown buyer" };
  else if (t === "adjustment.created" || t === "adjustment.updated") result = await recordAdjustment(evt.data as AdjData);
  await db.webhookEvent.create({ data: { id: evt.event_id, type: t } });
  return result;
}

/** Link to Paddle's customer portal so a subscriber can cancel or update payment details. */
export async function portalUrl(customerId: string, subscriptionId: string) {
  const key = process.env.PADDLE_API_KEY;
  if (!key) return null;
  const base = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const res = await fetch(`${base}/customers/${customerId}/portal-sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ subscription_ids: [subscriptionId] }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: { urls?: { general?: { overview?: string } } } };
  return j.data?.urls?.general?.overview ?? null;
}
