import Link from "next/link";
import { db } from "@/lib/db";
import { compact, relTime } from "@/lib/format";
import { setContentStatus } from "../actions";

export const metadata = { title: "Content · Admin" };

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const pastes = await db.paste.findMany({
      where: q ? { OR: [{ slug: q }, { title: { contains: q, mode: "insensitive" } }, { content: { contains: q } }] } : {},
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { user: { select: { username: true } } },
    });
  const Row = ({ slug, title, sub, who, status, views, at }: { slug: string; title: string; sub: string; who: string; status: string; views: number; at: Date }) => (
    <tr className="border-t border-line">
      <td className="max-w-[320px] px-4 py-3">
        <Link href={`/${slug}`} target="_blank" className="block truncate hover:text-rose">{title}</Link>
        <span className="block truncate font-mono text-xs text-muted">{sub}</span>
      </td>
      <td className="px-4 text-xs text-muted">@{who}</td>
      <td className="px-4 font-mono text-xs">{compact(views)}</td>
      <td className="px-4 text-xs text-muted">{relTime(at)}</td>
      <td className="px-4 text-right">
        <form action={setContentStatus.bind(null, slug, status === "ACTIVE" ? "REMOVED" : "ACTIVE")}>
          <button className={`btn btn-sm ${status === "ACTIVE" ? "btn-danger" : "btn-secondary"}`}>{status === "ACTIVE" ? "Remove" : "Restore"}</button>
        </form>
      </td>
    </tr>
  );
  return (
    <div className="space-y-6">
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Slug, title or text" className="input max-w-sm" />
        <button className="btn btn-secondary btn-sm">Search</button>
      </form>
      <section className="card overflow-x-auto">
        <p className="border-b border-line p-4 font-semibold">Pastes</p>
        <table className="w-full min-w-[700px] text-left text-sm">
          <tbody>
            {pastes.map((p) => (
              <Row key={p.id} slug={p.slug} title={p.title} sub={`/${p.slug} · ${p.visibility.toLowerCase()}${p.earning ? " · earning" : ""}`} who={p.user?.username ?? "anon"} status={p.status} views={p.views} at={p.createdAt} />
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
