import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { compact } from "@/lib/format";
import { PasteCard } from "@/components/PasteCard";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function Profile({ params }: Props) {
  const { username } = await params;
  const u = await db.user.findUnique({ where: { username: username.toLowerCase() } });
  if (!u || u.status !== "ACTIVE") notFound();
  const where = { userId: u.id, visibility: "PUBLIC" as const, status: "ACTIVE" as const, passwordHash: null, burnAfterRead: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] };
  const [pastes, count, views] = await Promise.all([
    db.paste.findMany({ where, orderBy: { createdAt: "desc" }, take: 60, select: { slug: true, title: true, language: true, lineCount: true, views: true, earning: true, createdAt: true, tags: true } }),
    db.paste.count({ where }),
    db.paste.aggregate({ where, _sum: { views: true } }),
  ]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient text-3xl font-extrabold">{(u.displayName || u.username)[0].toUpperCase()}</div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{u.displayName || u.username}</h1>
          <p className="text-muted">@{u.username} · joined {u.createdAt.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}</p>
        </div>
      </div>
      {u.bio && <p className="mt-4 max-w-2xl text-muted">{u.bio}</p>}
      <div className="mt-6 flex gap-8 font-mono text-sm">
        <span><span className="text-xl text-paper">{compact(count)}</span> <span className="text-muted">public pastes</span></span>
        <span><span className="text-xl text-paper">{compact(views._sum.views ?? 0)}</span> <span className="text-muted">views</span></span>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pastes.map((p) => <PasteCard key={p.slug} p={p} />)}
      </div>
      {!pastes.length && <p className="card mt-6 p-10 text-center text-muted">No public pastes yet.</p>}
    </div>
  );
}
