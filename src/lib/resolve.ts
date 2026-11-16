import "server-only";
import { db } from "./db";
import { buildSteps } from "./unlock";

/** Find an unlockable item by slug. Only link lockers have unlock steps; pastes open directly. */
export async function findUnlockable(kind: string, slug: string) {
  if (kind === "locker") {
    const l = await db.locker.findUnique({ where: { slug }, select: { id: true, userId: true, status: true, intensity: true, waitSeconds: true } });
    if (!l || l.status !== "ACTIVE") return null;
    return { id: l.id, userId: l.userId, kind: "LOCKER" as const, steps: buildSteps(l.intensity, l.waitSeconds) };
  }
  return null;
}
