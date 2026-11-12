import { db } from "@/lib/db";
import { languageLabel } from "@/lib/languages";
import { ogCard, ogSize } from "@/lib/og";

export const size = ogSize;
export const contentType = "image/png";
export const alt = "Paste on Pastify";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.paste.findUnique({ where: { slug } });
  if (!p || p.status !== "ACTIVE" || p.visibility === "PRIVATE") return ogCard({ title: "Paste. Share. Earn.", meta: "Pastify" });
  return ogCard({
    title: p.title,
    meta: `${p.lineCount} lines · ${languageLabel(p.language)} · ${p.visibility.toLowerCase()}`,
    badge: p.earning ? "Unlock to view" : undefined,
  });
}
