import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pastes = await db.paste.findMany({
    where: { visibility: "PUBLIC", status: "ACTIVE", passwordHash: null, burnAfterRead: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: { createdAt: "desc" },
    take: 5000,
    select: { slug: true, updatedAt: true },
  });
  const statics = ["", "/explore", "/earn", "/pricing", "/docs/api", "/legal/terms", "/legal/privacy", "/legal/content"].map((p) => ({ url: `${SITE_URL}${p}` }));
  return [...statics, ...pastes.map((p) => ({ url: `${SITE_URL}/${p.slug}`, lastModified: p.updatedAt }))];
}
