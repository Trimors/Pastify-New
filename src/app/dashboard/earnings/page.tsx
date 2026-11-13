import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EARN } from "@/lib/config";
import { balanceOf } from "@/lib/unlock";
import { usd, MICROS } from "@/lib/money";
import { shortDate } from "@/lib/format";
import { CashoutForm, PayoutMethodForm } from "@/components/EarningsForms";
import { cashout, savePayoutMethod } from "./actions";

export const metadata = { title: "Earnings" };

const TYPE_LABEL = { EARNING: "Unlock earnings", REFERRAL: "Referral commission", PAYOUT: "Cashout", PAYOUT_REVERSAL: "Cashout returned", ADJUSTMENT: "Adjustment", PREMIUM_SALE: "Premium sales", PREMIUM_REFUND: "Premium refunds" } as const;

export default async function EarningsPage() {
  const user = await requireUser();
  const [balance, payouts, lifetime, paid, ledger] = await Promise.all([
    balanceOf(user.id),
    db.payout.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.ledgerEntry.aggregate({ where: { userId: user.id, type: { in: ["EARNING", "REFERRAL", "ADJUSTMENT", "PREMIUM_SALE", "PREMIUM_REFUND"] } }, _sum: { amountMicros: true } }),
    db.payout.aggregate({ where: { userId: user.id, status: "PAID" }, _sum: { amountMicros: true } }),
    // Daily roll-up of earnings so the ledger stays readable at high volume.
    db.$queryRaw<{ d: Date; type: string; amount: bigint; n: bigint }[]>`
      SELECT date_trunc('day', "createdAt") AS d, type::text, sum("amountMicros") AS amount, count(*) AS n
      FROM "LedgerEntry" WHERE "userId" = ${user.id} GROUP BY 1, 2 ORDER BY 1 DESC LIMIT 30`,
  ]);
  const pending = payouts.filter((p) => p.status === "PENDING");
  const pendingSum = pending.reduce((a, p) => a + p.amountMicros, 0n);
  const last = payouts.find((p) => p.status !== "REJECTED");
  const cooldownUntil = last ? new Date(last.createdAt.getTime() + EARN.payoutCooldownDays * 864e5) : null;
  const min = EARN.payoutMinimumUsd;
  const bal = Number(balance) / MICROS;
  const disabled = !user.payoutMethod
    ? "Add a payout method to cash out."
    : bal < min
      ? `You need ${usd(BigInt(min * MICROS))} to cash out.`
      : pending.length >= EARN.maxPendingPayouts
        ? "Wait for your current cashouts to finish."
        : cooldownUntil && cooldownUntil > new Date()
          ? `Next cashout from ${shortDate(cooldownUntil)}.`
          : undefined;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Earnings</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Box k="Available" v={usd(balance)} accent />
        <Box k="In progress" v={usd(pendingSum)} />
        <Box k="Paid out" v={usd(paid._sum.amountMicros ?? 0n)} />
        <Box k="Lifetime earned" v={usd(lifetime._sum.amountMicros ?? 0n)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5">
          <p className="mb-3 font-semibold">Cash out</p>
          <CashoutForm action={cashout} balance={bal} min={min} disabled={disabled} />
        </section>
        <section className="card p-5">
          <p className="mb-3 font-semibold">Payout method</p>
          <PayoutMethodForm action={savePayoutMethod} methods={EARN.payoutMethods} current={{ method: user.payoutMethod, destination: user.payoutDestination }} />
        </section>
        <section className="card p-5 text-sm">
          <p className="mb-3 font-semibold">Payout rules</p>
          <ul className="space-y-2 text-muted">
            <li>Minimum: <span className="text-paper">${min}</span></li>
            <li>Paid within <span className="text-paper">{EARN.payoutTargetDays} business days</span></li>
            <li>One request every <span className="text-paper">{EARN.payoutCooldownDays} days</span></li>
            <li>Up to <span className="text-paper">{EARN.maxPendingPayouts}</span> in progress at once</li>
            <li>Rejected cashouts go straight back to your balance, with a reason.</li>
          </ul>
        </section>
      </div>

      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Cashouts</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr><th className="px-4 py-2.5">Requested</th><th className="px-4">Amount</th><th className="px-4">Method</th><th className="px-4">Status</th><th className="px-4">Note</th></tr>
            </thead>
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-3">{shortDate(p.createdAt)}</td>
                  <td className="px-4 font-mono">{usd(p.amountMicros)}</td>
                  <td className="px-4 text-muted">{EARN.payoutMethods.find((m) => m.id === p.method)?.label ?? p.method}</td>
                  <td className="px-4"><StatusChip s={p.status} /></td>
                  <td className="px-4 text-muted">{p.note ?? (p.processedAt ? shortDate(p.processedAt) : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payouts.length && <p className="p-8 text-center text-sm text-muted">No cashouts yet.</p>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Activity</p>
        <table className="w-full text-left text-sm">
          <tbody>
            {ledger.map((r, i) => (
              <tr key={i} className="border-t border-line first:border-t-0">
                <td className="px-4 py-2.5 text-muted">{shortDate(new Date(r.d))}</td>
                <td className="px-4">{TYPE_LABEL[r.type as keyof typeof TYPE_LABEL] ?? r.type}{r.type === "EARNING" && <span className="text-muted"> · {Number(r.n)} unlocks</span>}</td>
                <td className={`px-4 text-right font-mono ${r.amount < 0n ? "text-muted" : "text-ok"}`}>{r.amount < 0n ? "−" : "+"}{usd(r.amount < 0n ? -r.amount : r.amount, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!ledger.length && <p className="p-8 text-center text-sm text-muted">No activity yet.</p>}
      </section>
    </div>
  );
}

function Box({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <p className="label">{k}</p>
      <p className={`font-mono text-3xl ${accent ? "text-rose" : ""}`}>{v}</p>
    </div>
  );
}

function StatusChip({ s }: { s: string }) {
  const cls = s === "PAID" ? "chip-public" : s === "REJECTED" ? "chip-removed" : "chip-unlisted";
  return <span className={`chip ${cls}`}>{s === "PENDING" ? "In progress" : s[0] + s.slice(1).toLowerCase()}</span>;
}
