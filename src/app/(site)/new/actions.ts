"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { clientIp, getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasGrant } from "@/lib/grant";
import { createPaste, updatePaste, updatePasteAuthorized } from "@/lib/pastes";
import { rateLimit } from "@/lib/ratelimit";

export type PasteState = { error?: string } | undefined;

function message(e: unknown) {
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Check the form.";
  if (e instanceof Error) return e.message;
  return "Something failed. Try again.";
}

export async function createPasteAction(_: PasteState, form: FormData): Promise<PasteState> {
  const user = await getUser();
  const ip = await clientIp();
  const ok = user ? await rateLimit(`paste:u:${user.id}`, 60, 3600) : await rateLimit(`paste:ip:${ip}`, 15, 3600);
  if (!ok) return { error: "Too many pastes in the last hour. Try again later." };
  let slug: string;
  try {
    const p = await createPaste(Object.fromEntries(form), user?.id ?? null);
    slug = p.slug;
    if (p.editCode) {
      // Shown once on the paste page right after creation.
      (await cookies()).set(`pf_ec_${p.slug}`, p.editCode, { httpOnly: true, sameSite: "lax", maxAge: 600, path: `/${p.slug}` });
    }
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/${slug}?created=1`);
}

/** Saves edits. Allowed for the owner, or for a browser that entered the paste's edit code. */
export async function updatePasteAction(id: string, _: PasteState, form: FormData): Promise<PasteState> {
  const user = await getUser();
  const viaCode = await hasGrant("ec", id);
  if (!user && !viaCode) return { error: "Enter the edit code again." };
  let slug: string;
  try {
    const existing = await db.paste.findUnique({ where: { id }, select: { userId: true } });
    const isOwner = !!user && existing?.userId === user.id;
    if (!isOwner && !viaCode) return { error: "You can't edit this paste." };
    const p = isOwner
      ? await updatePaste(id, Object.fromEntries(form), { userId: user!.id })
      : await updatePasteWithGrant(id, form);
    slug = p.slug;
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/${slug}?saved=1`);
}

/** The grant cookie already proved the edit code, so only content fields may change here. */
async function updatePasteWithGrant(id: string, form: FormData) {
  const fields = Object.fromEntries(form);
  // Code holders can't move a paste into the owner's folders or change its edit code.
  delete fields.folder;
  delete fields.editCode;
  return updatePasteAuthorized(id, fields);
}

export type CloneResult = { error?: string; data?: { title: string; content: string; format: "code" | "rich"; language?: string; filename?: string; source: string } };

export async function cloneAction(input: string): Promise<CloneResult> {
  const user = await getUser();
  const ip = await clientIp();
  if (!(await rateLimit(`clone:${user?.id ?? ip}`, 30, 600))) return { error: "Too many clones. Wait a few minutes." };
  try {
    const { importPaste } = await import("@/lib/importer");
    return { data: await importPaste(String(input).slice(0, 500), user?.id ?? null) };
  } catch (e) {
    return { error: message(e) };
  }
}

export async function loadTemplateAction(id: string): Promise<{ error?: string; data?: { title: string; content: string; format: "code" | "rich" } }> {
  const user = await getUser();
  if (!user) return { error: "Log in to use templates." };
  const t = await db.template.findFirst({ where: { id, userId: user.id } });
  if (!t) return { error: "Template not found." };
  return { data: { title: t.title, content: t.content, format: t.format === "code" ? "code" : "rich" } };
}
