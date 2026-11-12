import "server-only";
import { z } from "zod";
import { db } from "./db";
import { hashPassword } from "./auth";
import { shortId } from "./ids";
import { LANGUAGE_IDS, detectLanguage } from "./languages";

export const MAX_PASTE_BYTES = 512 * 1024;

export const EXPIRY_OPTIONS = [
  { id: "never", label: "Never", minutes: 0 },
  { id: "10m", label: "10 minutes", minutes: 10 },
  { id: "1h", label: "1 hour", minutes: 60 },
  { id: "1d", label: "1 day", minutes: 1440 },
  { id: "7d", label: "7 days", minutes: 10080 },
  { id: "30d", label: "30 days", minutes: 43200 },
  { id: "1y", label: "1 year", minutes: 525600 },
] as const;

const boolish = z
  .union([z.boolean(), z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === true || v === "on" || v === "true");

export const pasteInput = z.object({
  title: z.string().trim().max(120).optional().default(""),
  filename: z.string().trim().max(120).optional().default(""),
  language: z.string().optional().default(""),
  content: z.string().min(1, "Paste is empty."),
  description: z.string().trim().max(500).optional().default(""),
  tags: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((t) =>
      (Array.isArray(t) ? t : (t ?? "").split(","))
        .map((s) => s.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ""))
        .filter(Boolean)
        .slice(0, 8),
    ),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional().default("PUBLIC"),
  earning: boolish,
  burnAfterRead: boolish,
  password: z.string().max(200).optional().default(""),
  removePassword: boolish,
  expiry: z.enum(EXPIRY_OPTIONS.map((e) => e.id) as [string, ...string[]]).optional(),
  folder: z.string().trim().max(60).optional().default(""),
});

export type PasteInput = z.input<typeof pasteInput>;

async function newSlug() {
  for (let i = 0; i < 8; i++) {
    const s = shortId();
    const [p, l] = await Promise.all([
      db.paste.findUnique({ where: { slug: s }, select: { id: true } }),
      db.locker.findUnique({ where: { slug: s }, select: { id: true } }),
    ]);
    if (!p && !l) return s;
  }
  throw new Error("Could not allocate a link. Try again.");
}

export { newSlug };

async function folderId(userId: string | null, name: string) {
  if (!userId || !name) return null;
  const f = await db.folder.upsert({ where: { userId_name: { userId, name } }, create: { userId, name }, update: {} });
  return f.id;
}

function normalise(data: z.output<typeof pasteInput>, userId: string | null) {
  const bytes = Buffer.byteLength(data.content, "utf8");
  if (bytes > MAX_PASTE_BYTES) throw new Error("Paste is larger than 512 KB.");
  let language = LANGUAGE_IDS.includes(data.language) ? data.language : "";
  if (!language || language === "auto") language = detectLanguage(data.filename) ?? "text";
  const earning = !!userId && data.earning && data.visibility !== "PRIVATE" && !data.burnAfterRead;
  const title = data.title || data.filename || "Untitled paste";
  return {
    title,
    filename: data.filename || null,
    language,
    content: data.content,
    description: data.description || null,
    tags: data.tags,
    visibility: userId ? data.visibility : data.visibility === "PRIVATE" ? "UNLISTED" : data.visibility,
    earning,
    burnAfterRead: data.burnAfterRead,
    lineCount: data.content.split("\n").length,
    sizeBytes: bytes,
  } as const;
}

function expiryDate(id: string | undefined) {
  const opt = EXPIRY_OPTIONS.find((e) => e.id === id);
  return opt && opt.minutes > 0 ? new Date(Date.now() + opt.minutes * 60e3) : null;
}

export async function createPaste(raw: unknown, userId: string | null) {
  const data = pasteInput.parse(raw);
  const base = normalise(data, userId);
  return db.paste.create({
    data: {
      ...base,
      slug: await newSlug(),
      userId,
      folderId: await folderId(userId, data.folder),
      passwordHash: data.password ? await hashPassword(data.password) : null,
      expiresAt: expiryDate(data.expiry),
    },
  });
}

export async function updatePaste(id: string, raw: unknown, userId: string) {
  const data = pasteInput.partial({ content: true }).parse(raw);
  const existing = await db.paste.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Paste not found.");
  const merged = pasteInput.parse({
    title: data.title ?? existing.title,
    filename: data.filename ?? existing.filename ?? "",
    language: data.language || existing.language,
    content: data.content ?? existing.content,
    description: data.description ?? existing.description ?? "",
    tags: (raw as Record<string, unknown>)?.tags !== undefined ? data.tags : existing.tags,
    visibility: data.visibility ?? existing.visibility,
    earning: (raw as Record<string, unknown>)?.earning !== undefined ? data.earning : existing.earning,
    burnAfterRead: (raw as Record<string, unknown>)?.burnAfterRead !== undefined ? data.burnAfterRead : existing.burnAfterRead,
  });
  const base = normalise(merged, userId);
  return db.paste.update({
    where: { id },
    data: {
      ...base,
      ...(data.folder !== undefined ? { folderId: await folderId(userId, data.folder) } : {}),
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : data.removePassword ? { passwordHash: null } : {}),
      ...(data.expiry ? { expiresAt: expiryDate(data.expiry) } : {}),
    },
  });
}

export function isExpired(p: { expiresAt: Date | null }) {
  return !!p.expiresAt && p.expiresAt < new Date();
}

export function publicPaste(p: {
  slug: string; title: string; filename: string | null; language: string; visibility: string; earning: boolean;
  expiresAt: Date | null; views: number; unlocks: number; lineCount: number; sizeBytes: number; createdAt: Date; tags: string[];
  passwordHash?: string | null; burnAfterRead?: boolean;
}) {
  return {
    slug: p.slug,
    title: p.title,
    filename: p.filename,
    language: p.language,
    visibility: p.visibility.toLowerCase(),
    earning: p.earning,
    passwordProtected: !!p.passwordHash,
    burnAfterRead: !!p.burnAfterRead,
    tags: p.tags,
    lines: p.lineCount,
    bytes: p.sizeBytes,
    views: p.views,
    unlocks: p.unlocks,
    expiresAt: p.expiresAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  };
}
