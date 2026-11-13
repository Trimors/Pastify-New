import { db } from "@/lib/db";
import { apiError, json, withApi } from "@/lib/api";
import { publicPaste, updatePaste } from "@/lib/pastes";
import { SITE_URL } from "@/lib/config";

type Ctx = { params: Promise<{ slug: string }> };

async function own(slug: string, userId: string) {
  return db.paste.findFirst({ where: { slug, userId } });
}

export const GET = withApi<Ctx>(async (_req, user, { params }) => {
  const p = await own((await params).slug, user.id);
  if (!p) return apiError("not_found", "Paste not found.", 404);
  return json({ data: { ...publicPaste(p), content: p.content, url: `${SITE_URL}/${p.slug}` } });
});

export const PATCH = withApi<Ctx>(async (req, user, { params }) => {
  const p = await own((await params).slug, user.id);
  if (!p) return apiError("not_found", "Paste not found.", 404);
  const updated = await updatePaste(p.id, await req.json(), { userId: user.id });
  return json({ data: { ...publicPaste(updated), url: `${SITE_URL}/${updated.slug}` } });
});

export const DELETE = withApi<Ctx>(async (_req, user, { params }) => {
  const res = await db.paste.deleteMany({ where: { slug: (await params).slug, userId: user.id } });
  if (!res.count) return apiError("not_found", "Paste not found.", 404);
  return json({ deleted: true });
});
