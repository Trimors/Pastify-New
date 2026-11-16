import Link from "next/link";
import { languageLabel } from "@/lib/languages";
import { compact, relTime } from "@/lib/format";
import { EarningChip } from "./Chips";

type P = { slug: string; title: string; language: string; lineCount: number; views: number; earning: boolean; createdAt: Date; tags: string[]; user?: { username: string } | null };

export function PasteCard({ p }: { p: P }) {
  return (
    <Link href={`/${p.slug}`} className="card group block p-4 transition-colors hover:border-[#4a3a57]">
      <div className="flex items-start justify-between gap-3">
        <p className="truncate font-semibold group-hover:text-rose">{p.title}</p>
        {p.earning && <EarningChip />}
      </div>
      <p className="mt-2 font-mono text-xs text-muted">
        {languageLabel(p.language)} · {p.lineCount} lines · {compact(p.views)} views
      </p>
      <p className="mt-3 text-xs text-muted">
        {p.user ? `@${p.user.username}` : "Anonymous"} · {relTime(p.createdAt)}
        {p.tags.slice(0, 3).map((t) => (
          <span key={t} className="ml-2 text-rose">#{t}</span>
        ))}
      </p>
    </Link>
  );
}
