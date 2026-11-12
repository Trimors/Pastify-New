import { db } from "@/lib/db";
import { apiError, json, withApi } from "@/lib/api";
import { publicLocker, updateLocker } from "@/lib/lockers";
import { SITE_URL } from "@/lib/config";

type Ctx = { params: Promise<{ slug: string }> };

export const GET = withApi<Ctx>(async (_req, user, { params }) => {
  const l = await db.locker.findFirst({ where: { slug: (await params).slug, userId: user.id } });
  if (!l) return apiError("not_found", "Locker not found.", 404);
  return json({ data: { ...publicLocker(l), url: `${SITE_URL}/l/${l.slug}` } });
});

export const PATCH = withApi<Ctx>(async (req, user, { params }) => {
  const l = await db.locker.findFirst({ where: { slug: (await params).slug, userId: user.id } });
  if (!l) return apiError("not_found", "Locker not found.", 404);
  const body = (await req.json()) as Record<string, unknown>;
  const u = await updateLocker(l.id, { ...body, ...(body.target ? { targetUrl: body.target } : {}) }, user.id);
  return json({ data: { ...publicLocker(u), url: `${SITE_URL}/l/${u.slug}` } });
});

export const DELETE = withApi<Ctx>(async (_req, user, { params }) => {
  const res = await db.locker.deleteMany({ where: { slug: (await params).slug, userId: user.id } });
  if (!res.count) return apiError("not_found", "Locker not found.", 404);
  return json({ deleted: true });
});
