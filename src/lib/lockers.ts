import "server-only";
import { z } from "zod";
import { db } from "./db";
import { newSlug } from "./pastes";

export const INTENSITIES = [
  { id: "light", label: "Light", hint: "1 short step. Best conversion." },
  { id: "standard", label: "Standard", hint: "2 steps. Balanced." },
  { id: "heavy", label: "Heavy", hint: "3 steps. Highest value per unlock." },
] as const;

const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .url("Enter a full link starting with https://")
  .refine((u) => /^https?:\/\//i.test(u), "Only http and https links are allowed.");

export const lockerInput = z.object({
  title: z.string().trim().min(1, "Add a title.").max(100),
  targetUrl: httpUrl,
  description: z.string().trim().max(300).optional().default(""),
  intensity: z.enum(["light", "standard", "heavy"]).optional().default("standard"),
  waitSeconds: z.coerce.number().int().min(0).max(120).optional().default(0),
});

export async function createLocker(raw: unknown, userId: string) {
  const d = lockerInput.parse(raw);
  return db.locker.create({
    data: { ...d, description: d.description || null, slug: await newSlug(), userId },
  });
}

export async function updateLocker(id: string, raw: unknown, userId: string) {
  const d = lockerInput.partial().parse(raw);
  const existing = await db.locker.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Locker not found.");
  return db.locker.update({ where: { id }, data: { ...d, ...(d.description !== undefined ? { description: d.description || null } : {}) } });
}

export function publicLocker(l: { slug: string; title: string; targetUrl: string; description: string | null; intensity: string; waitSeconds: number; views: number; unlocks: number; createdAt: Date }) {
  return {
    slug: l.slug,
    title: l.title,
    target: l.targetUrl,
    description: l.description,
    intensity: l.intensity,
    waitSeconds: l.waitSeconds,
    views: l.views,
    unlocks: l.unlocks,
    createdAt: l.createdAt.toISOString(),
  };
}
