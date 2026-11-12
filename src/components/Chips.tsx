import type { Visibility } from "@prisma/client";

export function VisibilityChip({ v }: { v: Visibility }) {
  const map = { PUBLIC: ["chip-public", "Public"], UNLISTED: ["chip-unlisted", "Unlisted"], PRIVATE: ["chip-private", "Private"] } as const;
  const [cls, label] = map[v];
  return <span className={`chip ${cls}`}>{label}</span>;
}

export function EarningChip() {
  return (
    <span className="chip chip-earning">
      <span className="h-1.5 w-1.5 rounded-full bg-pink" /> Earning
    </span>
  );
}
