import "server-only";
import { db } from "./db";
import { buildSteps } from "./unlock";
import { isExpired } from "./pastes";

/** Find an unlockable item (earning paste or locker) by slug. */
export async function findUnlockable(kind: string, slug: string) {
  if (kind === "paste") {
    const p = await db.paste.findUnique({ where: { slug }, select: { id: true, userId: true, earning: true, status: true, visibility: true, expiresAt: true } });
    if (!p || p.status !== "ACTIVE" || !p.earning || p.visibility === "PRIVATE" || isExpired(p)) return null;
    return { id: p.id, userId: p.userId, kind: "PASTE" as const, steps: buildSteps("standard", 0) };
  }
  if (kind === "locker") {
    const l = await db.locker.findUnique({ where: { slug }, select: { id: true, userId: true, status: true, intensity: true, waitSeconds: true } });
    if (!l || l.status !== "ACTIVE") return null;
    return { id: l.id, userId: l.userId, kind: "LOCKER" as const, steps: buildSteps(l.intensity, l.waitSeconds) };
  }
  return null;
}
