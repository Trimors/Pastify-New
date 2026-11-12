import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EARN, SITE_HOST, SITE_URL } from "@/lib/config";
import { usd } from "@/lib/money";
import { relTime } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { SimpleForm } from "@/components/SimpleForm";
import { setReferralCode } from "./actions";

export const metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const user = await requireUser();
  const [referred, commissions] = await Promise.all([
    db.user.findMany({ where: { referredById: user.id }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, username: true, createdAt: true } }),
    db.ledgerEntry.groupBy({ by: ["refId"], where: { userId: user.id, type: "REFERRAL" }, _sum: { amountMicros: true } }),
  ]);
  const byUser = new Map(commissions.map((c) => [c.refId, c._sum.amountMicros ?? 0n]));
  const total = commissions.reduce((a, c) => a + (c._sum.amountMicros ?? 0n), 0n);
  const ids = referred.map((r) => r.id);
  const lastItems = ids.length
    ? await db.$queryRaw<{ uid: string; last: Date }[]>`
        SELECT uid, max(c) AS last FROM (
          SELECT "userId" AS uid, max("createdAt") AS c FROM "Paste" WHERE "userId" = ANY(${ids}) GROUP BY 1
          UNION ALL SELECT "userId", max("createdAt") FROM "Locker" WHERE "userId" = ANY(${ids}) GROUP BY 1
        ) t GROUP BY uid`
    : [];
  const lastMap = new Map(lastItems.map((r) => [r.uid, new Date(r.last)]));
  const monthAgo = Date.now() - 30 * 864e5;
  const active = referred.filter((r) => (lastMap.get(r.id)?.getTime() ?? 0) > monthAgo).length;
  const link = `${SITE_URL}/r/${user.referralCode}`;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Referrals</h1>
        <p className="text-sm text-muted">Earn {EARN.referralRate * 100}% of what the creators you invite earn. Paid by Pastify, not taken from them.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <Box k="Commission rate" v={`${EARN.referralRate * 100}%`} />
        <Box k="Total commission" v={usd(total)} accent />
        <Box k="Active referrals" v={String(active)} />
        <Box k="Inactive referrals" v={String(referred.length - active)} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card space-y-3 p-5">
          <p className="font-semibold">Your link</p>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-ink px-3 py-2">
            <span className="truncate font-mono text-sm">{SITE_HOST}/r/{user.referralCode}</span>
            <CopyButton text={link} />
          </div>
        </section>
        <section className="card p-5">
          <p className="mb-3 font-semibold">Custom code</p>
          <SimpleForm action={setReferralCode} submit="Save" className="flex flex-wrap items-start gap-2">
            <input name="code" defaultValue={user.referralCode} className="input !w-auto flex-1 font-mono text-sm" />
          </SimpleForm>
        </section>
      </div>
      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Your referred users</p>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2.5">User</th><th className="px-4">Joined</th><th className="px-4">Last created</th><th className="px-4 text-right">Commission</th></tr>
          </thead>
          <tbody>
            {referred.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className="px-4 py-3">@{r.username}</td>
                <td className="px-4 text-muted">{relTime(r.createdAt)}</td>
                <td className="px-4 text-muted">{lastMap.get(r.id) ? relTime(lastMap.get(r.id)!) : "Nothing yet"}</td>
                <td className="px-4 text-right font-mono">{usd(byUser.get(r.id) ?? 0n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!referred.length && <p className="p-8 text-center text-sm text-muted">Share your link to invite creators.</p>}
      </section>
    </div>
  );
}

function Box({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="card p-5">
      <p className="label">{k}</p>
      <p className={`font-mono text-2xl ${accent ? "text-rose" : ""}`}>{v}</p>
    </div>
  );
}
