import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { isPremium, paddleReady } from "@/lib/premium";
import { SITE_URL } from "@/lib/config";
import { UnlockGate } from "@/components/UnlockGate";
import { CopyButton } from "@/components/CopyButton";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  return db.locker.findUnique({ where: { slug }, include: { user: { select: { username: true } } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await load((await params).slug);
  if (!l || l.status !== "ACTIVE") return { title: "Link" };
  return { title: l.title, description: l.description || "Unlock this link on Pastify.", robots: { index: false } };
}

export default async function LockerPage({ params, searchParams }: Props & { searchParams: Promise<{ d?: string }> }) {
  const { slug } = await params;
  const { d } = await searchParams;
  const dest = d && /^[A-Za-z0-9]{4,16}$/.test(d) ? d : null;
  const l = await load(slug);
  if (!l) notFound();
  const user = await getUser();
  const isOwner = user?.id === l.userId;
  if (l.status !== "ACTIVE") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">Link removed</h1>
        <p className="mt-2 text-muted">This link was removed for breaking the content policy.</p>
      </div>
    );
  }
  const alt = dest ? await db.lockerTarget.findFirst({ where: { code: dest, lockerId: l.id }, select: { url: true } }) : null;
  let host = "";
  try {
    host = new URL(alt?.url ?? l.targetUrl).hostname;
  } catch {}
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">{l.title}</h1>
        {l.description && <p className="mt-2 text-muted">{l.description}</p>}
        <p className="mt-2 text-sm text-muted">
          Shared by <Link href={`/u/${l.user.username}`} className="text-rose hover:underline">@{l.user.username}</Link>
          {host && <> · leads to <span className="font-mono">{host}</span></>}
        </p>
      </div>
      {isOwner ? (
        <div className="card space-y-4 p-6">
          <p className="font-semibold">This is your locker</p>
          <p className="text-sm text-muted">Visitors see the unlock steps here. Your own visits don&apos;t count.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={`${SITE_URL}/l/${l.slug}`} label="Copy share link" className="btn btn-primary btn-sm" />
            <a href={l.targetUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Open target</a>
            <Link href={`/dashboard/lockers/${l.id}`} className="btn btn-secondary btn-sm">Edit</Link>
          </div>
        </div>
      ) : (
        isPremium(user) ? (
          <div className="card space-y-4 p-6 text-center">
            <p className="font-semibold">Premium: no steps needed</p>
            <a href={`/l/${l.slug}/go${dest ? `?d=${dest}` : ""}`} className="btn btn-primary w-full">Open link</a>
          </div>
        ) : (
          <UnlockGate kind="locker" slug={l.slug} onDoneHref={`/l/${l.slug}/go${dest ? `?d=${dest}` : ""}`} premiumHref={paddleReady() ? `/premium?via=locker:${l.slug}` : undefined} />
        )
      )}
      <p className="mt-6 text-center text-xs text-muted">
        <Link href={`/report?slug=${l.slug}&kind=locker`} className="hover:text-paper">Report this link</Link>
      </p>
    </div>
  );
}
