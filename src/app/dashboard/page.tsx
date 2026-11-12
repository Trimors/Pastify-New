import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { breakdown, overview, series, PERIODS } from "@/lib/stats";
import { balanceOf } from "@/lib/unlock";
import { usd } from "@/lib/money";
import { compact, num, pct, dayMonth } from "@/lib/format";
import { countryName, flag } from "@/lib/geo";
import { EARN } from "@/lib/config";
import { AreaChart, BarList } from "@/components/charts";
import { PeriodTabs } from "@/components/PeriodTabs";

export const metadata = { title: "Dashboard" };

const METRICS = [
  { id: "views", label: "Views" },
  { id: "unlocks", label: "Unlocks" },
  { id: "earnings", label: "Earnings" },
] as const;

type SP = Promise<{ period?: string; metric?: string; welcome?: string }>;

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const sp = await searchParams;
  const period = PERIODS.some((p) => p.id === sp.period) ? sp.period! : "28d";
  const metric = (METRICS.find((m) => m.id === sp.metric)?.id ?? "views") as (typeof METRICS)[number]["id"];

  const [stats, points, balance, countries, sources, referrers, devices, browsers, top, counts] = await Promise.all([
    overview(user.id, period),
    series(user.id, period),
    balanceOf(user.id),
    breakdown(user.id, period, "country"),
    breakdown(user.id, period, "source"),
    breakdown(user.id, period, "referrerDomain"),
    breakdown(user.id, period, "device"),
    breakdown(user.id, period, "browser"),
    breakdown(user.id, period, "resourceId", 6),
    Promise.all([db.paste.count({ where: { userId: user.id } }), db.locker.count({ where: { userId: user.id } })]),
  ]);

  const ids = top.map((t) => t.key);
  const [pastes, lockers] = await Promise.all([
    db.paste.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true } }),
    db.locker.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, slug: true } }),
  ]);
  const titles = new Map([...pastes.map((p) => [p.id, { t: p.title, href: `/${p.slug}` }] as const), ...lockers.map((l) => [l.id, { t: l.title, href: `/l/${l.slug}` }] as const)]);

  const chartData = points.map((p) => ({
    label: period === "today" ? p.day : dayMonth(new Date(p.day)),
    value: metric === "earnings" ? p.earnings / 1e6 : p[metric],
  }));
  const fmt = metric === "earnings" ? (n: number) => `$${n.toFixed(2)}` : (n: number) => compact(n);
  const empty = counts[0] + counts[1] === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-muted">Signed in as @{user.username}</p>
        </div>
        <PeriodTabs current={period} base="/dashboard" extra={{ metric }} />
      </div>

      {(sp.welcome || empty) && (
        <div className="card relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient opacity-[0.06]" />
          <p className="relative text-lg font-semibold">{sp.welcome ? "Account created." : "Nothing shared yet."} Make your first earning link.</p>
          <p className="relative mt-1 text-sm text-muted">Create a paste with Earning on, or lock any link. Share it anywhere and every unique unlock pays you.</p>
          <div className="relative mt-4 flex flex-wrap gap-2">
            <Link href="/new" className="btn btn-primary btn-sm">Create paste</Link>
            <Link href="/dashboard/lockers/new" className="btn btn-secondary btn-sm">Lock a link</Link>
            <Link href="/earn" className="btn btn-ghost btn-sm">See rates</Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
        <div className="card flex flex-col justify-between p-5">
          <div>
            <p className="label">Current balance</p>
            <p className="font-mono text-4xl font-medium">{usd(balance)}</p>
            <p className="mt-1 text-xs text-muted">Cash out from ${EARN.payoutMinimumUsd}. Paid within {EARN.payoutTargetDays} business days.</p>
          </div>
          <Link href="/dashboard/earnings" className="btn btn-secondary btn-sm mt-4 self-start">Cash out</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Kpi label="Views" value={num(stats.views)} />
          <Kpi label="Unlocks" value={num(stats.unlocks)} />
          <Kpi label="Earnings" value={usd(stats.earnings)} accent />
          <Kpi label="Unlock rate" value={pct(stats.unlockRate)} />
          <Kpi label="CPM" value={usd(stats.cpm)} hint="Per 1,000 unlocks" />
          <Kpi label="Avg EPV" value={usd(stats.epv, 4)} hint="Earnings per view" />
        </div>
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="font-semibold">Performance</p>
          <div className="inline-flex rounded-lg border border-line bg-ink p-1 text-xs font-semibold">
            {METRICS.map((m) => (
              <Link key={m.id} scroll={false} href={{ pathname: "/dashboard", query: { period, metric: m.id } }} className={`rounded-md px-3 py-1 ${metric === m.id ? "bg-surface-2 text-paper" : "text-muted hover:text-paper"}`}>
                {m.label}
              </Link>
            ))}
          </div>
        </div>
        <AreaChart data={chartData} format={fmt} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top content">
          <BarList
            rows={top.map((t) => {
              const it = titles.get(t.key);
              return {
                label: it ? <Link href={it.href} className="hover:text-rose">{it.t}</Link> : "Deleted item",
                value: t.views,
                extra: t.earnings > 0n ? <span className="mr-3 text-rose">{usd(t.earnings)}</span> : null,
              };
            })}
          />
        </Panel>
        <Panel title="Countries">
          <BarList rows={countries.map((c) => ({ label: `${flag(c.key)}  ${countryName(c.key)}`, value: c.views, extra: c.earnings > 0n ? <span className="mr-3 text-rose">{usd(c.earnings)}</span> : null }))} />
        </Panel>
        <Panel title="Sources">
          <BarList rows={sources.map((s) => ({ label: s.key[0].toUpperCase() + s.key.slice(1), value: s.views }))} />
        </Panel>
        <Panel title="Referring sites">
          <BarList rows={referrers.map((s) => ({ label: <span className="font-mono text-xs">{s.key}</span>, value: s.views }))} />
        </Panel>
        <Panel title="Devices">
          <BarList rows={devices.map((s) => ({ label: s.key[0].toUpperCase() + s.key.slice(1), value: s.views }))} />
        </Panel>
        <Panel title="Browsers">
          <BarList rows={browsers.map((s) => ({ label: s.key, value: s.views }))} />
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className="card p-4">
      <p className="label">{label}</p>
      <p className={`font-mono text-2xl font-medium ${accent ? "text-rose" : ""}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <p className="mb-3 font-semibold">{title}</p>
      {children}
    </section>
  );
}
