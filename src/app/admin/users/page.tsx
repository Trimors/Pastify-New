import { db } from "@/lib/db";
import { usd } from "@/lib/money";
import { relTime } from "@/lib/format";
import { adjustBalance, setUserStatus } from "../actions";

export const metadata = { title: "Users · Admin" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const users = await db.user.findMany({
    where: q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { username: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { _count: { select: { pastes: true, lockers: true, referrals: true } } },
  });
  const balances = await db.ledgerEntry.groupBy({ by: ["userId"], where: { userId: { in: users.map((u) => u.id) } }, _sum: { amountMicros: true } });
  const bal = new Map(balances.map((b) => [b.userId, b._sum.amountMicros ?? 0n]));
  return (
    <div className="space-y-4">
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search email or username" className="input max-w-sm" />
        <button className="btn btn-secondary btn-sm">Search</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2.5">User</th><th className="px-4">Joined</th><th className="px-4">Items</th><th className="px-4">Balance</th><th className="px-4">Adjust</th><th className="px-4" /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-line align-top">
                <td className="px-4 py-3">
                  <p>@{u.username} {u.role === "ADMIN" && <span className="chip chip-earning ml-1">Admin</span>} {u.status === "SUSPENDED" && <span className="chip chip-removed ml-1">Suspended</span>}</p>
                  <p className="text-xs text-muted">{u.email}{u.totpEnabled ? " · 2FA" : ""}</p>
                </td>
                <td className="px-4 py-3 text-xs text-muted">{relTime(u.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-muted">{u._count.pastes} pastes · {u._count.lockers} lockers · {u._count.referrals} refs</td>
                <td className="px-4 py-3 font-mono">{usd(bal.get(u.id) ?? 0n)}</td>
                <td className="px-4 py-3">
                  <form action={adjustBalance.bind(null, u.id)} className="flex gap-1">
                    <input name="amount" type="number" step="0.01" placeholder="±USD" className="input !w-20 !py-1 text-xs" />
                    <input name="note" placeholder="Note" className="input !w-28 !py-1 text-xs" />
                    <button className="btn btn-secondary btn-sm">Apply</button>
                  </form>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.role !== "ADMIN" && (
                    <form action={setUserStatus.bind(null, u.id, u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE")}>
                      <button className={`btn btn-sm ${u.status === "ACTIVE" ? "btn-danger" : "btn-secondary"}`}>{u.status === "ACTIVE" ? "Suspend" : "Restore"}</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
