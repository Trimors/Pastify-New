import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { cache } from "react";
import { db } from "./db";
import { sha256, token } from "./ids";

const COOKIE = "pf_session";
const SESSION_DAYS = 30;

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}

export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

/**
 * Client IP from the one header your proxy sets (IP_HEADER). For x-forwarded-for we take the
 * last hop, which the nearest proxy appended and the visitor can't forge.
 */
export async function clientIp() {
  const h = await headers();
  const name = (process.env.IP_HEADER || "x-forwarded-for").toLowerCase();
  const v = h.get(name);
  if (!v) return "0.0.0.0";
  if (name === "x-forwarded-for") return v.split(",").map((s) => s.trim()).filter(Boolean).pop() || "0.0.0.0";
  return v.trim();
}

export async function createSession(userId: string) {
  const raw = token();
  const h = await headers();
  await db.session.create({
    data: {
      id: sha256(raw),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5),
      ip: await clientIp(),
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  (await cookies()).set(COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw) await db.session.deleteMany({ where: { id: sha256(raw) } });
  jar.delete(COOKIE);
}

export const getUser = cache(async () => {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const session = await db.session.findUnique({ where: { id: sha256(raw) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status !== "ACTIVE") return null;
  return session.user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
