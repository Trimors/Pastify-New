import Link from "next/link";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { LANGUAGES } from "@/lib/languages";
import { PasteCard } from "@/components/PasteCard";

export const metadata = { title: "Explore", description: "Public pastes from the Pastify community." };
export const dynamic = "force-dynamic";

const PAGE = 24;

export default async function Explore({ searchParams }: { searchParams: Promise<{ q?: string; tag?: string; lang?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = sp.sort === "trending" ? "trending" : "new";
  const where: Prisma.PasteWhereInput = {
    visibility: "PUBLIC",
    status: "ACTIVE",
    passwordHash: null,
    burnAfterRead: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    ...(q ? { AND: [{ OR: [{ title: { contains: q, mode: "insensitive" } }, { filename: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] }] } : {}),
    ...(sp.tag ? { tags: { has: sp.tag.toLowerCase() } } : {}),
    ...(sp.lang && LANGUAGES.some((l) => l.id === sp.lang) ? { language: sp.lang } : {}),
    ...(sort === "trending" ? { createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } : {}),
  };
  const [items, total] = await Promise.all([
    db.paste.findMany({
      where,
      orderBy: sort === "trending" ? [{ views: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      select: { slug: true, title: true, language: true, lineCount: true, views: true, earning: true, createdAt: true, tags: true, user: { select: { username: true } } },
    }),
    db.paste.count({ where }),
  ]);
  const link = (o: Record<string, string | number | undefined>) => ({ pathname: "/explore", query: Object.fromEntries(Object.entries({ q, tag: sp.tag, lang: sp.lang, sort, ...o }).filter(([, v]) => v)) });
  const pages = Math.ceil(total / PAGE);
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Explore</h1>
          <p className="text-sm text-muted">Public pastes from the community.{sp.tag && <> Tagged <span className="text-rose">#{sp.tag}</span>.</>}</p>
        </div>
        <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs font-semibold">
          <Link href={link({ sort: "new", page: undefined })} className={`rounded-md px-3 py-1.5 ${sort === "new" ? "bg-surface-2" : "text-muted"}`}>Newest</Link>
          <Link href={link({ sort: "trending", page: undefined })} className={`rounded-md px-3 py-1.5 ${sort === "trending" ? "bg-surface-2" : "text-muted"}`}>Trending</Link>
        </div>
      </div>
      <form className="mt-6 flex flex-wrap gap-2" action="/explore">
        <input type="hidden" name="sort" value={sort} />
        {sp.tag && <input type="hidden" name="tag" value={sp.tag} />}
        <input name="q" defaultValue={q} placeholder="Search pastes" className="input min-w-[200px] flex-1" />
        <select name="lang" defaultValue={sp.lang ?? ""} className="input !w-auto">
          <option value="">All languages</option>
          {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
        </select>
        <button className="btn btn-secondary">Search</button>
      </form>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((p) => <PasteCard key={p.slug} p={p} />)}
      </div>
      {!items.length && <p className="card mt-6 p-10 text-center text-muted">No pastes found.</p>}
      {pages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          {page > 1 && <Link href={link({ page: page - 1 })} className="btn btn-secondary btn-sm">Previous</Link>}
          <span className="px-3 py-1.5 text-sm text-muted">Page {page} of {pages}</span>
          {page < pages && <Link href={link({ page: page + 1 })} className="btn btn-secondary btn-sm">Next</Link>}
        </div>
      )}
    </div>
  );
}
