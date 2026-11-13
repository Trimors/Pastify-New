import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasGrant } from "@/lib/grant";
import { highlight } from "@/lib/highlight";
import { richToText, sanitizeRich } from "@/lib/rich";
import { isExpired } from "@/lib/pastes";
import { isPremium, paddleReady } from "@/lib/premium";
import { languageLabel } from "@/lib/languages";
import { SITE_HOST, SITE_URL } from "@/lib/config";
import { bytes, compact, relTime, shortDate, timeLeft } from "@/lib/format";
import { CopyButton } from "@/components/CopyButton";
import { EarningChip, VisibilityChip } from "@/components/Chips";
import { UnlockGate } from "@/components/UnlockGate";
import { ViewBeacon } from "@/components/ViewBeacon";
import { BurnGate, CodeBlock, PasswordGate, RichBlock } from "./Gates";
import { PasteShortcuts, ShareButtons } from "./PasteTools";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ created?: string; saved?: string }> };

async function load(slug: string) {
  if (!/^[A-Za-z0-9_-]{3,32}$/.test(slug)) return null;
  return db.paste.findUnique({ where: { slug }, include: { user: { select: { username: true, displayName: true } } } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).slug);
  if (!p || p.status !== "ACTIVE" || p.visibility === "PRIVATE") return { title: "Paste" };
  const kind = p.format === "rich" ? "Rich text" : languageLabel(p.language);
  const desc = p.description || `${p.lineCount} lines · ${kind} · ${p.visibility.toLowerCase()}`;
  return {
    title: p.title,
    description: desc,
    robots: p.visibility === "PUBLIC" && !p.passwordHash ? undefined : { index: false },
    openGraph: { title: `${p.title} on Pastify`, description: desc, url: `${SITE_URL}/${p.slug}` },
  };
}

export default async function PastePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { created, saved } = await searchParams;
  const p = await load(slug);
  const user = await getUser();
  if (!p) notFound();
  const isOwner = !!user && user.id === p.userId;
  const isAdmin = user?.role === "ADMIN";

  if (p.status === "REMOVED" && !isAdmin) {
    return <Notice title="Paste removed" body="This paste was removed for breaking the content policy." />;
  }
  if (p.visibility === "PRIVATE" && !isOwner && !isAdmin) notFound();
  if (isExpired(p) && !isOwner) {
    return <Notice title="Paste expired" body={`This paste expired on ${shortDate(p.expiresAt!)}.`} />;
  }

  const needsPassword = !!p.passwordHash && !isOwner && !(await hasGrant("pw", p.id));
  const premium = isPremium(user);
  const needsUnlock = p.earning && !isOwner && !isAdmin && !premium && !(await hasGrant("u", p.id));
  const burnGate = p.burnAfterRead && !isOwner;
  const showContent = !needsPassword && !needsUnlock && !burnGate;
  const rich = p.format === "rich";
  const html = showContent && !rich ? await highlight(p.content, p.language) : null;
  const richHtml = showContent && rich ? sanitizeRich(p.content) : null;
  const plain = showContent ? (rich ? richToText(p.content) : p.content) : "";
  const url = `${SITE_URL}/${p.slug}`;
  const editCode = created ? (await cookies()).get(`pf_ec_${p.slug}`)?.value : undefined;
  const canEditWithCode = !isOwner && !!p.editCodeHash;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {(created || saved) && (isOwner || editCode || saved) && (
        <div className="card mb-6 space-y-3 border-magenta/40 p-4 fade-up">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">{created ? "Your paste is live" : "Changes saved"}</p>
              <p className="font-mono text-sm text-muted">{SITE_HOST}/{p.slug}</p>
            </div>
            <CopyButton text={url} label="Copy link" className="btn btn-primary btn-sm" />
          </div>
          {editCode && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm">
              <span className="flex-1">
                <span className="font-semibold text-warn">Save your edit code.</span> You need it to edit this paste later. It won&apos;t be shown again.
              </span>
              <code className="rounded bg-ink px-2 py-1 font-mono">{editCode}</code>
              <CopyButton text={editCode} label="Copy code" />
            </div>
          )}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold tracking-tight">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <VisibilityChip v={p.visibility} />
            {p.earning && <EarningChip />}
            {p.expiresAt && <span className="chip">{isExpired(p) ? "Expired" : `Expires in ${timeLeft(p.expiresAt)}`}</span>}
            {p.passwordHash && <span className="chip">Password</span>}
            {p.burnAfterRead && <span className="chip">Burn after read</span>}
            {p.status === "REMOVED" && <span className="chip chip-removed">Removed</span>}
            <span>·</span>
            {p.user ? (
              <Link href={`/u/${p.user.username}`} className="text-rose hover:underline">@{p.user.username}</Link>
            ) : (
              <span>Anonymous</span>
            )}
            <span>· {relTime(p.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {showContent && <CopyButton text={plain} label="Copy" />}
          {showContent && (
            <a href={`/${p.slug}/raw`} className="btn btn-secondary btn-sm">Raw</a>
          )}
          {showContent && (
            <a href={`/${p.slug}/raw?download=1`} className="btn btn-secondary btn-sm">Download</a>
          )}
          <CopyButton text={url} label="Copy link" />
          {isOwner && <Link href={`/dashboard/pastes/${p.id}`} className="btn btn-secondary btn-sm">Edit</Link>}
          {canEditWithCode && <Link href={`/${p.slug}/edit`} className="btn btn-ghost btn-sm">Edit</Link>}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-muted">
        {p.filename && <span>{p.filename}</span>}
        <span>{rich ? "Rich text" : languageLabel(p.language)}</span>
        <span>{p.lineCount} lines</span>
        <span>{bytes(p.sizeBytes)}</span>
        <span>{compact(p.views)} views</span>
        {p.tags.map((t) => (
          <Link key={t} href={`/explore?tag=${t}`} className="text-rose hover:underline">#{t}</Link>
        ))}
      </div>
      {p.description && <p className="mb-4 max-w-3xl text-sm text-muted">{p.description}</p>}

      {needsPassword ? (
        <PasswordGate slug={p.slug} />
      ) : needsUnlock ? (
        <UnlockGate kind="paste" slug={p.slug} premiumHref={paddleReady() ? `/premium?via=paste:${p.slug}` : undefined} />
      ) : burnGate ? (
        <BurnGate slug={p.slug} />
      ) : rich ? (
        <RichBlock html={richHtml ?? ""} />
      ) : (
        <CodeBlock html={html} content={p.content} />
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <ShareButtons url={url} title={p.title} />
        <PasteShortcuts url={url} copyText={showContent ? plain : null} editHref={isOwner ? `/dashboard/pastes/${p.id}` : canEditWithCode ? `/${p.slug}/edit` : null} rawHref={showContent ? `/${p.slug}/raw` : null} title={p.title} />
      </div>

      {showContent && (!p.earning || premium) && !isOwner && <ViewBeacon slug={p.slug} />}

      {!isOwner && (
        <p className="mt-6 text-right text-xs text-muted">
          <Link href={`/report?slug=${p.slug}`} className="hover:text-paper">Report this paste</Link>
        </p>
      )}
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">{body}</p>
      <Link href="/new" className="btn btn-primary mt-6">Create a paste</Link>
    </div>
  );
}
