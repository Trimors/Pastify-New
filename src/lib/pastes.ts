import "server-only";
import { z } from "zod";
import { db } from "./db";
import { hashPassword, verifyPassword } from "./auth";
import { shortId, token } from "./ids";
import { richToText, sanitizeRich } from "./rich";
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
  // "" means "keep current" in the edit form.
  expiry: z.preprocess((v) => (v === "" ? undefined : v), z.enum(EXPIRY_OPTIONS.map((e) => e.id) as [string, ...string[]]).optional()),
  folder: z.string().trim().max(60).optional().default(""),
  format: z.enum(["code", "rich"]).optional().default("code"),
  /** Custom edit code. Anonymous pastes always get one (generated if empty). */
  editCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .default("")
    .refine((v) => !v || v.length >= 6, "Edit code needs at least 6 characters."),
});

export type PasteInput = z.input<typeof pasteInput>;

/** Six-character top-level pages a random slug must never shadow. */
const RESERVED_SLUGS = new Set(["switch", "signup", "logout", "report", "search", "status"]);

async function newSlug() {
  for (let i = 0; i < 8; i++) {
    const s = shortId();
    if (RESERVED_SLUGS.has(s.toLowerCase())) continue;
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
  const rich = data.format === "rich";
  const content = rich ? sanitizeRich(data.content) : data.content;
  const text = rich ? richToText(content) : content;
  if (!text.trim()) throw new Error("Paste is empty.");
  const bytes = Buffer.byteLength(content, "utf8");
  if (bytes > MAX_PASTE_BYTES) throw new Error("Paste is larger than 512 KB.");
  let language = LANGUAGE_IDS.includes(data.language) ? data.language : "";
  if (rich) language = "text";
  else if (!language || language === "auto") language = detectLanguage(data.filename) ?? "text";
  const earning = !!userId && data.earning && data.visibility !== "PRIVATE" && !data.burnAfterRead;
  const title = data.title || data.filename || "Untitled paste";
  return {
    title,
    filename: data.filename || null,
    language,
    format: data.format,
    content,
    description: data.description || null,
    tags: data.tags,
    visibility: userId ? data.visibility : data.visibility === "PRIVATE" ? "UNLISTED" : data.visibility,
    earning,
    burnAfterRead: data.burnAfterRead,
    lineCount: text.split("\n").length,
    sizeBytes: bytes,
  } as const;
}

function expiryDate(id: string | undefined) {
  const opt = EXPIRY_OPTIONS.find((e) => e.id === id);
  return opt && opt.minutes > 0 ? new Date(Date.now() + opt.minutes * 60e3) : null;
}

/** Creates a paste. Returns it with `editCode` set when one was issued (shown to the creator once). */
export async function createPaste(raw: unknown, userId: string | null) {
  const data = pasteInput.parse(raw);
  const base = normalise(data, userId);
  const editCode = data.editCode || (userId ? "" : token(9));
  const p = await db.paste.create({
    data: {
      ...base,
      slug: await newSlug(),
      userId,
      folderId: await folderId(userId, data.folder),
      passwordHash: data.password ? await hashPassword(data.password) : null,
      editCodeHash: editCode ? await hashPassword(editCode) : null,
      expiresAt: expiryDate(data.expiry),
    },
  });
  return { ...p, editCode: editCode || null };
}

/** Who may edit: the owner (userId) or anyone holding the paste's edit code. */
export type EditAuth = { userId?: string | null; editCode?: string | null };

export async function canEdit(p: { userId: string | null; editCodeHash: string | null }, auth: EditAuth) {
  if (auth.userId && p.userId === auth.userId) return true;
  if (auth.editCode && p.editCodeHash) return verifyPassword(auth.editCode, p.editCodeHash);
  return false;
}

export async function updatePaste(id: string, raw: unknown, auth: EditAuth) {
  const existing = await db.paste.findUnique({ where: { id }, select: { userId: true, editCodeHash: true } });
  if (!existing || !(await canEdit(existing, auth))) throw new Error("Paste not found.");
  return updatePasteAuthorized(id, raw);
}

/** Applies an update. Only call after the caller has been authorized (owner or edit-code grant). */
export async function updatePasteAuthorized(id: string, raw: unknown) {
  const data = pasteInput.partial({ content: true }).parse(raw);
  const existing = await db.paste.findUnique({ where: { id } });
  if (!existing) throw new Error("Paste not found.");
  const r = (raw ?? {}) as Record<string, unknown>;
  const merged = pasteInput.parse({
    title: data.title ?? existing.title,
    filename: data.filename ?? existing.filename ?? "",
    language: data.language || existing.language,
    content: data.content ?? existing.content,
    format: r.format !== undefined ? data.format : existing.format,
    description: data.description ?? existing.description ?? "",
    tags: r.tags !== undefined ? data.tags : existing.tags,
    visibility: data.visibility ?? existing.visibility,
    earning: r.earning !== undefined ? data.earning : existing.earning,
    burnAfterRead: r.burnAfterRead !== undefined ? data.burnAfterRead : existing.burnAfterRead,
  });
  const ownerId = existing.userId;
  const base = normalise(merged, ownerId);
  return db.paste.update({
    where: { id },
    data: {
      ...base,
      ...(data.folder !== undefined && ownerId ? { folderId: await folderId(ownerId, data.folder) } : {}),
      ...(data.password ? { passwordHash: await hashPassword(data.password) } : data.removePassword ? { passwordHash: null } : {}),
      ...(data.editCode && ownerId ? { editCodeHash: await hashPassword(data.editCode) } : {}),
      ...(data.expiry ? { expiresAt: expiryDate(data.expiry) } : {}),
    },
  });
}

export function isExpired(p: { expiresAt: Date | null }) {
  return !!p.expiresAt && p.expiresAt < new Date();
}

export function publicPaste(p: {
  slug: string; title: string; filename: string | null; language: string; format?: string; visibility: string; earning: boolean;
  expiresAt: Date | null; views: number; unlocks: number; lineCount: number; sizeBytes: number; createdAt: Date; tags: string[];
  passwordHash?: string | null; burnAfterRead?: boolean;
}) {
  return {
    slug: p.slug,
    title: p.title,
    filename: p.filename,
    language: p.language,
    format: p.format ?? "code",
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
