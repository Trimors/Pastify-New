import { db } from "@/lib/db";
import { json, pageParams, withApi } from "@/lib/api";
import { createPaste, publicPaste } from "@/lib/pastes";
import { SITE_URL } from "@/lib/config";

export const GET = withApi(async (req, user) => {
  const { limit, page, skip } = pageParams(req);
  const [items, total] = await Promise.all([
    db.paste.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, skip, take: limit }),
    db.paste.count({ where: { userId: user.id } }),
  ]);
  return json({ data: items.map((p) => ({ ...publicPaste(p), url: `${SITE_URL}/${p.slug}` })), page, limit, total });
});

export const POST = withApi(async (req, user) => {
  const body = await req.json();
  const p = await createPaste(body, user.id);
  return json({ data: { ...publicPaste(p), url: `${SITE_URL}/${p.slug}` } }, 201);
});
