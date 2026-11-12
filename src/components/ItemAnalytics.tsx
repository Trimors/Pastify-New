import Link from "next/link";
import { breakdown, overview, series } from "@/lib/stats";
import { usd } from "@/lib/money";
import { compact, dayMonth, num, pct } from "@/lib/format";
import { countryName, flag } from "@/lib/geo";
import { AreaChart, BarList } from "./charts";

const METRICS = ["views", "unlocks", "earnings"] as const;

export async function ItemAnalytics({ ownerId, resourceId, period, metric, base }: { ownerId: string; resourceId: string; period: string; metric: string; base: string }) {
  const m = (METRICS as readonly string[]).includes(metric) ? (metric as (typeof METRICS)[number]) : "views";
  const [s, points, countries, sources, referrers, devices, browsers] = await Promise.all([
    overview(ownerId, period, resourceId),
    series(ownerId, period, resourceId),
    breakdown(ownerId, period, "country", 10, resourceId),
    breakdown(ownerId, period, "source", 8, resourceId),
    breakdown(ownerId, period, "referrerDomain", 8, resourceId),
    breakdown(ownerId, period, "device", 8, resourceId),
    breakdown(ownerId, period, "browser", 8, resourceId),
  ]);
  const data = points.map((p) => ({ label: period === "today" ? p.day : dayMonth(new Date(p.day)), value: m === "earnings" ? p.earnings / 1e6 : p[m] }));
  const cap = (x: string) => x[0].toUpperCase() + x.slice(1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {[
          ["Views", num(s.views)],
          ["Unlocks", num(s.unlocks)],
          ["Earnings", usd(s.earnings)],
          ["Unlock rate", pct(s.unlockRate)],
          ["CPM", usd(s.cpm)],
          ["Avg EPV", usd(s.epv, 4)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4">
            <p className="label">{k}</p>
            <p className="font-mono text-xl">{v}</p>
          </div>
        ))}
      </div>
      <section className="card p-5">
        <div className="mb-4 flex justify-end">
          <div className="inline-flex rounded-lg border border-line bg-ink p-1 text-xs font-semibold">
            {METRICS.map((x) => (
              <Link key={x} scroll={false} href={{ pathname: base, query: { period, metric: x } }} className={`rounded-md px-3 py-1 capitalize ${m === x ? "bg-surface-2" : "text-muted"}`}>{x}</Link>
            ))}
          </div>
        </div>
        <AreaChart data={data} format={m === "earnings" ? (n) => `$${n.toFixed(3)}` : (n) => compact(n)} />
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel t="Countries"><BarList rows={countries.map((c) => ({ label: `${flag(c.key)}  ${countryName(c.key)}`, value: c.views }))} /></Panel>
        <Panel t="Referring sites"><BarList rows={referrers.map((r) => ({ label: <span className="font-mono text-xs">{r.key}</span>, value: r.views }))} /></Panel>
        <Panel t="Sources"><BarList rows={sources.map((r) => ({ label: cap(r.key), value: r.views }))} /></Panel>
        <Panel t="Devices & browsers"><BarList rows={[...devices.map((r) => ({ label: cap(r.key), value: r.views })), ...browsers.map((r) => ({ label: r.key, value: r.views }))]} /></Panel>
      </div>
    </div>
  );
}

function Panel({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <p className="mb-3 font-semibold">{t}</p>
      {children}
    </section>
  );
}
