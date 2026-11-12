import { db } from "@/lib/db";
import { apiError, json, withApi } from "@/lib/api";

type Ctx = { params: Promise<{ slug: string; code: string }> };

export const DELETE = withApi<Ctx>(async (_req, user, { params }) => {
  const { slug, code } = await params;
  const res = await db.lockerTarget.deleteMany({ where: { code, locker: { slug, userId: user.id } } });
  if (!res.count) return apiError("not_found", "Destination not found.", 404);
  return json({ deleted: true });
});
