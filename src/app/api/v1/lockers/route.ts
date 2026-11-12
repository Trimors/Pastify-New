import { db } from "@/lib/db";
import { json, pageParams, withApi } from "@/lib/api";
import { createLocker, publicLocker } from "@/lib/lockers";
import { SITE_URL } from "@/lib/config";

export const GET = withApi(async (req, user) => {
  const { limit, page, skip } = pageParams(req);
  const [items, total] = await Promise.all([
    db.locker.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    db.locker.count({ where: { userId: user.id } }),
  ]);
  return json({ data: items.map((l) => ({ ...publicLocker(l), url: `${SITE_URL}/l/${l.slug}` })), page, limit, total });
});

export const POST = withApi(async (req, user) => {
  const body = (await req.json()) as Record<string, unknown>;
  // Accept "target" as an alias for "targetUrl".
  const l = await createLocker({ ...body, targetUrl: body.targetUrl ?? body.target }, user.id);
  return json({ data: { ...publicLocker(l), url: `${SITE_URL}/l/${l.slug}` } }, 201);
});
