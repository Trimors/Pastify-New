import { db } from "@/lib/db";
import { apiError, json, withApi } from "@/lib/api";
import { addLockerTarget } from "@/lib/lockers";
import { SITE_URL } from "@/lib/config";

type Ctx = { params: Promise<{ slug: string }> };

function out(slug: string, t: { code: string; url: string; label: string | null; createdAt: Date }) {
  return { code: t.code, target: t.url, label: t.label, url: `${SITE_URL}/l/${slug}?d=${t.code}`, createdAt: t.createdAt.toISOString() };
}

export const GET = withApi<Ctx>(async (_req, user, { params }) => {
  const { slug } = await params;
  const l = await db.locker.findFirst({ where: { slug, userId: user.id }, include: { targets: { orderBy: { createdAt: "desc" }, take: 1000 } } });
  if (!l) return apiError("not_found", "Locker not found.", 404);
  return json({ data: l.targets.map((t) => out(slug, t)) });
});

/** Body: { "target": "https://…", "label": "optional" } */
export const POST = withApi<Ctx>(async (req, user, { params }) => {
  const { slug } = await params;
  const l = await db.locker.findFirst({ where: { slug, userId: user.id }, select: { id: true } });
  if (!l) return apiError("not_found", "Locker not found.", 404);
  const body = (await req.json()) as Record<string, unknown>;
  const t = await addLockerTarget(l.id, user.id, { url: body.target ?? body.url, label: body.label });
  return json({ data: out(slug, t) }, 201);
});
