import Link from "next/link";
import { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { itemStats, sparklines, PERIODS } from "@/lib/stats";
import { usd } from "@/lib/money";
import { compact, relTime } from "@/lib/format";
import { SITE_URL } from "@/lib/config";
import { Sparkline } from "@/components/charts";
import { CopyButton } from "@/components/CopyButton";
import { DeleteButton } from "@/components/DeleteButton";
import { EarningChip, VisibilityChip } from "@/components/Chips";
import { PeriodTabs } from "@/components/PeriodTabs";
import { deleteItem } from "../actions";

export const metadata = { title: "Vault" };

const PAGE = 20;
type SP = Promise<{ tab?: string; q?: string; sort?: string; page?: string; folder?: string; period?: string; best?: string }>;

export default async function VaultPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tab = sp.tab === "lockers" ? "lockers" : "pastes";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);
  const period = PERIODS.some((p) => p.id === sp.period) ? sp.period! : "7d";
  const best = ["views", "unlocks", "earnings"].includes(sp.best ?? "") ? sp.best! : "views";
  const sortKey = ["new", "old", "views", "unlocks"].includes(sp.sort ?? "") ? sp.sort! : "new";
  const order =
    sortKey === "old" ? { createdAt: "asc" as const } : sortKey === "views" ? { views: "desc" as const } : sortKey === "unlocks" ? { unlocks: "desc" as const } : { createdAt: "desc" as const };

  const folders = await db.folder.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } });

  // Best performing
  const stats = await itemStats(user.id, period);
  stats.sort((a, b) => (best === "earnings" ? Number(b.earnings - a.earnings) : best === "unlocks" ? b.unlocks - a.unlocks : b.views - a.views));
  const top = stats.slice(0, 6);
  const [tp, tl] = await Promise.all([
    db.paste.findMany({ where: { id: { in: top.map((t) => t.id) } }, select: { id: true, title: true, slug: true } }),
    db.locker.findMany({ where: { id: { in: top.map((t) => t.id) } }, select: { id: true, title: true, slug: true } }),
  ]);
  const info = new Map([...tp.map((p) => [p.id, { t: p.title, href: `/${p.slug}` }] as const), ...tl.map((l) => [l.id, { t: l.title, href: `/l/${l.slug}` }] as const)]);

  let rows: React.ReactNode;
  let total = 0;
  if (tab === "pastes") {
    const where: Prisma.PasteWhereInput = {
      userId: user.id,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: q }, { filename: { contains: q, mode: "insensitive" } }, { tags: { has: q.toLowerCase() } }] } : {}),
      ...(sp.folder ? { folderId: sp.folder } : {}),
    };
    const [items, count] = await Promise.all([
      db.paste.findMany({ where, orderBy: order, skip: (page - 1) * PAGE, take: PAGE, include: { folder: true } }),
      db.paste.count({ where }),
    ]);
    total = count;
    const spark = await sparklines(items.map((i) => i.id));
    rows = items.map((p) => (
      <tr key={p.id} className="border-t border-line">
        <td className="max-w-[280px] py-3 pl-4 pr-3">
          <Link href={`/${p.slug}`} className="block truncate font-medium hover:text-rose">{p.title}</Link>
          <span className="flex flex-wrap items-center gap-1.5 pt-1">
            <VisibilityChip v={p.visibility} />
            {p.earning && <EarningChip />}
            {p.status === "REMOVED" && <span className="chip chip-removed">Removed</span>}
            {p.folder && <span className="chip">{p.folder.name}</span>}
          </span>
        </td>
        <td className="px-3 font-mono text-xs text-muted">{p.slug}</td>
        <td className="px-3 text-xs text-muted">{relTime(p.createdAt)}</td>
        <td className="px-3"><Sparkline values={spark.get(p.id) ?? []} /></td>
        <td className="px-3 text-right font-mono text-sm">{compact(p.views)}</td>
        <td className="px-3 text-right font-mono text-sm">{compact(p.unlocks)}</td>
        <td className="py-3 pl-3 pr-4">
          <div className="flex justify-end gap-1">
            <CopyButton text={`${SITE_URL}/${p.slug}`} label="Copy" className="btn btn-ghost btn-sm" />
            <Link href={`/dashboard/stats/${p.id}`} className="btn btn-ghost btn-sm">Stats</Link>
            <Link href={`/dashboard/pastes/${p.id}`} className="btn btn-ghost btn-sm">Edit</Link>
            <DeleteButton onDelete={deleteItem.bind(null, "paste", p.id)} />
          </div>
        </td>
      </tr>
    ));
  } else {
    const where: Prisma.LockerWhereInput = {
      userId: user.id,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: q }, { targetUrl: { contains: q, mode: "insensitive" } }] } : {}),
    };
    const [items, count] = await Promise.all([db.locker.findMany({ where, orderBy: order, skip: (page - 1) * PAGE, take: PAGE }), db.locker.count({ where })]);
    total = count;
    const spark = await sparklines(items.map((i) => i.id));
    rows = items.map((l) => (
      <tr key={l.id} className="border-t border-line">
        <td className="max-w-[280px] py-3 pl-4 pr-3">
          <Link href={`/l/${l.slug}`} className="block truncate font-medium hover:text-rose">{l.title}</Link>
          <span className="block truncate pt-1 font-mono text-xs text-muted">{l.targetUrl}</span>
        </td>
        <td className="px-3 font-mono text-xs text-muted">{l.slug}</td>
        <td className="px-3 text-xs text-muted">{relTime(l.createdAt)}</td>
        <td className="px-3"><Sparkline values={spark.get(l.id) ?? []} /></td>
        <td className="px-3 text-right font-mono text-sm">{compact(l.views)}</td>
        <td className="px-3 text-right font-mono text-sm">{compact(l.unlocks)}</td>
        <td className="py-3 pl-3 pr-4">
          <div className="flex justify-end gap-1">
            <CopyButton text={`${SITE_URL}/l/${l.slug}`} label="Copy" className="btn btn-ghost btn-sm" />
            <Link href={`/dashboard/stats/${l.id}`} className="btn btn-ghost btn-sm">Stats</Link>
            <Link href={`/dashboard/lockers/${l.id}`} className="btn btn-ghost btn-sm">Edit</Link>
            <DeleteButton onDelete={deleteItem.bind(null, "locker", l.id)} />
          </div>
        </td>
      </tr>
    ));
  }
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const qs = (o: Record<string, string | number | undefined>) => ({ pathname: "/dashboard/vault", query: Object.fromEntries(Object.entries({ tab, q, sort: sortKey, folder: sp.folder, period, best, ...o }).filter(([, v]) => v !== undefined && v !== "")) });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Vault</h1>
        <div className="flex gap-2">
          <Link href="/new" className="btn btn-primary btn-sm">New paste</Link>
          <Link href="/dashboard/lockers/new" className="btn btn-secondary btn-sm">New locker</Link>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Best performing</p>
          <div className="flex flex-wrap gap-2">
            <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs font-semibold">
              {["views", "unlocks", "earnings"].map((b) => (
                <Link key={b} scroll={false} href={qs({ best: b })} className={`rounded-md px-3 py-1.5 capitalize ${best === b ? "bg-surface-2 text-paper" : "text-muted"}`}>{b}</Link>
              ))}
            </div>
            <PeriodTabs current={period} base="/dashboard/vault" extra={{ tab, best }} />
          </div>
        </div>
        {top.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {top.map((t, i) => {
              const it = info.get(t.id);
              return (
                <div key={t.id} className="card p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-rose">#{i + 1}</span>
                    <span className="chip">{t.kind === "PASTE" ? "Paste" : "Locker"}</span>
                  </div>
                  <Link href={`/dashboard/stats/${t.id}`} className="mt-2 block truncate font-semibold hover:text-rose">{it?.t ?? "Deleted item"}</Link>
                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-sm">
                    <span><span className="block text-[10px] uppercase tracking-wider text-muted">Views</span>{compact(t.views)}</span>
                    <span><span className="block text-[10px] uppercase tracking-wider text-muted">Unlocks</span>{compact(t.unlocks)}</span>
                    <span><span className="block text-[10px] uppercase tracking-wider text-muted">Earned</span>{usd(t.earnings)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="card p-6 text-center text-sm text-muted">No views in this period yet.</p>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-3">
          <div className="inline-flex rounded-lg border border-line bg-ink p-1 text-xs font-semibold">
            <Link href={qs({ tab: "pastes", page: undefined, folder: undefined })} className={`rounded-md px-3 py-1.5 ${tab === "pastes" ? "bg-surface-2" : "text-muted"}`}>Pastes</Link>
            <Link href={qs({ tab: "lockers", page: undefined, folder: undefined })} className={`rounded-md px-3 py-1.5 ${tab === "lockers" ? "bg-surface-2" : "text-muted"}`}>Lockers</Link>
          </div>
          <form className="flex flex-1 flex-wrap gap-2" action="/dashboard/vault">
            <input type="hidden" name="tab" value={tab} />
            <input name="q" defaultValue={q} placeholder="Search title, ID, tag…" className="input !w-auto min-w-[180px] flex-1 !py-1.5 text-sm" />
            {tab === "pastes" && folders.length > 0 && (
              <select name="folder" defaultValue={sp.folder ?? ""} className="input !w-auto !py-1.5 text-sm">
                <option value="">All folders</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            )}
            <select name="sort" defaultValue={sortKey} className="input !w-auto !py-1.5 text-sm">
              <option value="new">Newest</option>
              <option value="old">Oldest</option>
              <option value="views">Most views</option>
              <option value="unlocks">Most unlocks</option>
            </select>
            <button className="btn btn-secondary btn-sm">Apply</button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2.5 pl-4 pr-3 font-semibold">Title</th>
                <th className="px-3 font-semibold">ID</th>
                <th className="px-3 font-semibold">Created</th>
                <th className="px-3 font-semibold">14 days</th>
                <th className="px-3 text-right font-semibold">Views</th>
                <th className="px-3 text-right font-semibold">Unlocks</th>
                <th className="pl-3 pr-4" />
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
          {total === 0 && <p className="p-8 text-center text-sm text-muted">{q ? "No matches." : tab === "pastes" ? "No pastes yet." : "No lockers yet."}</p>}
        </div>
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-line p-3 text-sm text-muted">
            <span>Page {page} of {pages} · {total} items</span>
            <div className="flex gap-2">
              {page > 1 && <Link href={qs({ page: page - 1 })} className="btn btn-secondary btn-sm">Previous</Link>}
              {page < pages && <Link href={qs({ page: page + 1 })} className="btn btn-secondary btn-sm">Next</Link>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
