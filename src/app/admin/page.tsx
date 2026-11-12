import Link from "next/link";
import { db } from "@/lib/db";
import { usd } from "@/lib/money";
import { num, relTime } from "@/lib/format";
import { EARN } from "@/lib/config";
import { dismissReport, markPaid, rejectPayout, setContentStatus } from "./actions";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const [users, pastes, lockers, viewsToday, earnToday, payouts, reports, liability] = await Promise.all([
    db.user.count(),
    db.paste.count(),
    db.locker.count(),
    db.viewEvent.count({ where: { createdAt: { gte: today } } }),
    db.viewEvent.aggregate({ where: { createdAt: { gte: today } }, _sum: { earningMicros: true } }),
    db.payout.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, include: { user: { select: { username: true, email: true, createdAt: true } } } }),
    db.report.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "asc" }, take: 50 }),
    db.ledgerEntry.aggregate({ _sum: { amountMicros: true } }),
  ]);
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Box k="Users" v={num(users)} />
        <Box k="Pastes" v={num(pastes)} />
        <Box k="Lockers" v={num(lockers)} />
        <Box k="Views today" v={num(viewsToday)} />
        <Box k="Owed today" v={usd(earnToday._sum.earningMicros ?? 0n)} />
        <Box k="Total balances" v={usd(liability._sum.amountMicros ?? 0n)} />
      </div>

      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Pending cashouts · {payouts.length}</p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <tbody>
              {payouts.map((p) => (
                <tr key={p.id} className="border-t border-line first:border-t-0 align-top">
                  <td className="px-4 py-3">
                    <p>@{p.user.username}</p>
                    <p className="text-xs text-muted">{p.user.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono">{usd(p.amountMicros)}</td>
                  <td className="px-4 py-3">
                    <p>{EARN.payoutMethods.find((m) => m.id === p.method)?.label ?? p.method}</p>
                    <p className="break-all font-mono text-xs text-muted">{p.destination}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{relTime(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <form action={markPaid.bind(null, p.id)}><button className="btn btn-primary btn-sm">Mark paid</button></form>
                      <form action={rejectPayout.bind(null, p.id)} className="flex gap-2">
                        <input name="note" placeholder="Reason" className="input !w-36 !py-1 text-xs" required />
                        <button className="btn btn-danger btn-sm">Reject</button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!payouts.length && <p className="p-8 text-center text-sm text-muted">Nothing to pay.</p>}
        </div>
      </section>

      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Open reports · {reports.length}</p>
        <ul>
          {reports.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start gap-4 border-t border-line p-4 first:border-t-0">
              <div className="min-w-0 flex-1">
                <Link href={r.kind === "PASTE" ? `/${r.slug}` : `/l/${r.slug}`} target="_blank" className="font-mono text-sm text-rose hover:underline">
                  {r.kind === "PASTE" ? "/" : "/l/"}{r.slug}
                </Link>
                <p className="mt-1 text-sm"><span className="chip mr-2">{r.reason}</span>{r.details}</p>
                <p className="mt-1 text-xs text-muted">{r.reporterEmail ?? "Anonymous"} · {relTime(r.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <form action={setContentStatus.bind(null, r.kind, r.slug, "REMOVED")}><button className="btn btn-danger btn-sm">Remove content</button></form>
                <form action={dismissReport.bind(null, r.id)}><button className="btn btn-secondary btn-sm">Dismiss</button></form>
              </div>
            </li>
          ))}
        </ul>
        {!reports.length && <p className="p-8 text-center text-sm text-muted">No open reports.</p>}
      </section>
    </div>
  );
}

function Box({ k, v }: { k: string; v: string }) {
  return (
    <div className="card p-4">
      <p className="label">{k}</p>
      <p className="font-mono text-xl">{v}</p>
    </div>
  );
}
