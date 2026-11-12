import "server-only";
import { db } from "./db";
import { sha256, token } from "./ids";

export async function createApiKey(userId: string, name: string) {
  const raw = `pf_${token(24)}`;
  await db.apiKey.create({ data: { userId, name: name || "API key", prefix: raw.slice(0, 10), keyHash: sha256(raw) } });
  return raw;
}

export async function userFromApiKey(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const raw = auth.replace(/^Bearer\s+/i, "").trim();
  if (!raw.startsWith("pf_")) return null;
  const key = await db.apiKey.findUnique({ where: { keyHash: sha256(raw) }, include: { user: true } });
  if (!key || key.user.status !== "ACTIVE") return null;
  if (!key.lastUsedAt || Date.now() - key.lastUsedAt.getTime() > 60e3) {
    await db.apiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
  }
  return key.user;
}
