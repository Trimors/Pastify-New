import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERIODS } from "@/lib/stats";
import { SITE_URL } from "@/lib/config";
import { ItemAnalytics } from "@/components/ItemAnalytics";
import { PeriodTabs } from "@/components/PeriodTabs";
import { CopyButton } from "@/components/CopyButton";

export const metadata = { title: "Analytics" };

export default async function ItemStatsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ period?: string; metric?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const period = PERIODS.some((p) => p.id === sp.period) ? sp.period! : "28d";
  const [paste, locker] = await Promise.all([
    db.paste.findFirst({ where: { id, userId: user.id }, select: { title: true, slug: true } }),
    db.locker.findFirst({ where: { id, userId: user.id }, select: { title: true, slug: true } }),
  ]);
  const item = paste
    ? { ...paste, href: `/${paste.slug}`, edit: `/dashboard/pastes/${id}` }
    : locker
      ? { ...locker, href: `/l/${locker.slug}`, edit: `/dashboard/lockers/${id}` }
      : null;
  if (!item) notFound();
  const base = `/dashboard/stats/${id}`;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="label">{paste ? "Paste" : "Locker"} analytics</p>
          <h1 className="truncate text-3xl font-bold tracking-tight">{item.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={item.href} className="btn btn-secondary btn-sm">Open</Link>
            <Link href={item.edit} className="btn btn-secondary btn-sm">Edit</Link>
            <CopyButton text={`${SITE_URL}${item.href}`} label="Copy link" />
          </div>
        </div>
        <PeriodTabs current={period} base={base} extra={{ metric: sp.metric ?? "views" }} />
      </div>
      <ItemAnalytics ownerId={user.id} resourceId={id} period={period} metric={sp.metric ?? "views"} base={base} />
    </div>
  );
}
