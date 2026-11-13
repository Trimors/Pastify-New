import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS, SHARE, paddleReady } from "@/lib/premium";
import { SITE_HOST, SITE_URL } from "@/lib/config";
import { usd } from "@/lib/money";
import { relTime } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Premium sales" };

export default async function CreatorPremiumPage() {
  const user = await requireUser();
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const monthAgo = new Date(Date.now() - 28 * 864e5);
  const [today, month, lifetime, activeSubs, recent] = await Promise.all([
    db.premiumSale.count({ where: { creatorId: user.id, createdAt: { gte: dayStart } } }),
    db.premiumSale.aggregate({ where: { creatorId: user.id, createdAt: { gte: monthAgo } }, _count: { _all: true }, _sum: { shareMicros: true, refundedMicros: true } }),
    db.premiumSale.aggregate({ where: { creatorId: user.id }, _count: { _all: true }, _sum: { shareMicros: true, refundedMicros: true } }),
    db.subscription.count({ where: { creatorId: user.id, status: { in: ["active", "trialing", "past_due"] } } }),
    db.premiumSale.findMany({ where: { creatorId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const net = (a: typeof month) => (a._sum.shareMicros ?? 0n) - (a._sum.refundedMicros ?? 0n);
  const boosted = today >= SHARE.boostFromSaleOfDay - 1;
  const link = `${SITE_URL}/premium?ref=${user.referralCode}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Premium sales</h1>
        <p className="text-sm text-muted">
          Visitors can skip your unlocks by buying Premium. You get {SHARE.basePct}% of the plan price (before tax) on each sale and every renewal, and {SHARE.boostedPct}% from your {SHARE.boostFromSaleOfDay}th sale of the day (UTC).
        </p>
        {!paddleReady() && <p className="mt-2 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">Premium checkout isn&apos;t switched on yet. Sales will show here once it is.</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Box k="Next sale pays" v={`${boosted ? SHARE.boostedPct : SHARE.basePct}%`} hint={boosted ? `${today} sales today: boosted until midnight UTC` : `${today} of ${SHARE.boostFromSaleOfDay - 1} sales today to unlock ${SHARE.boostedPct}%`} accent />
        <Box k="Earned, 28 days" v={usd(net(month))} hint={`${month._count._all} sales`} />
        <Box k="Active subscribers" v={String(activeSubs)} hint="Renewals keep paying you" />
        <Box k="Earned, all time" v={usd(net(lifetime))} hint={`${lifetime._count._all} sales`} />
      </div>

      <section className="card space-y-3 p-5">
        <p className="font-semibold">Your Premium link</p>
        <p className="text-sm text-muted">Sales count for you when visitors buy from one of your unlock pages, or from this link.</p>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink px-3 py-2">
          <span className="truncate font-mono text-sm">{SITE_HOST}/premium?ref={user.referralCode}</span>
          <CopyButton text={link} />
        </div>
      </section>

      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Recent sales</p>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2.5">When</th><th className="px-4">Plan</th><th className="px-4">Type</th><th className="px-4">Rate</th><th className="px-4 text-right">Your share</th></tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-4 py-3 text-muted">{relTime(s.createdAt)}</td>
                <td className="px-4">{PLANS.find((p) => p.id === s.plan)?.label ?? s.plan}</td>
                <td className="px-4 text-muted">{s.renewal ? "Renewal" : "New"}</td>
                <td className="px-4 font-mono">{s.sharePct}%</td>
                <td className="px-4 text-right font-mono">
                  {usd(s.shareMicros - s.refundedMicros)}
                  {s.refundedMicros > 0n && <span className="ml-2 text-xs text-bad">{s.refundedMicros >= s.shareMicros ? "refunded" : "partly refunded"}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!recent.length && <p className="p-8 text-center text-sm text-muted">No Premium sales yet.</p>}
      </section>
    </div>
  );
}

function Box({ k, v, hint, accent }: { k: string; v: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <p className="label">{k}</p>
      <p className={`font-mono text-3xl ${accent ? "text-rose" : ""}`}>{v}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
