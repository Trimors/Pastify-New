import Link from "next/link";
import { PERIODS } from "@/lib/stats";

export function PeriodTabs({ current, base, extra = {} }: { current: string; base: string; extra?: Record<string, string> }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-surface p-1 text-xs font-semibold">
      {PERIODS.map((p) => (
        <Link
          key={p.id}
          href={{ pathname: base, query: { ...extra, period: p.id } }}
          className={`rounded-md px-3 py-1.5 ${current === p.id ? "bg-surface-2 text-paper" : "text-muted hover:text-paper"}`}
          scroll={false}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}
