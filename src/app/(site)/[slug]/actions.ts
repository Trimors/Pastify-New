"use server";
import { db } from "@/lib/db";
import { clientIp, getUser, verifyPassword } from "@/lib/auth";
import { setGrant } from "@/lib/grant";
import { rateLimit } from "@/lib/ratelimit";
import { highlight } from "@/lib/highlight";
import { revalidatePath } from "next/cache";

export async function unlockPassword(slug: string, _: { error?: string } | undefined, form: FormData) {
  const ip = await clientIp();
  if (!(await rateLimit(`pw:${ip}:${slug}`, 10, 600))) return { error: "Too many tries. Wait 10 minutes." };
  const p = await db.paste.findUnique({ where: { slug }, select: { id: true, passwordHash: true } });
  if (!p?.passwordHash) return { error: "Paste not found." };
  if (!(await verifyPassword(String(form.get("password") || ""), p.passwordHash))) return { error: "Wrong password." };
  await setGrant("pw", p.id, 12);
  revalidatePath(`/${slug}`);
  return {};
}

/** Burn-after-read pastes are revealed by an explicit click, so link-preview bots never burn them. */
export async function revealBurn(slug: string) {
  const user = await getUser();
  const p = await db.paste.findUnique({ where: { slug } });
  if (!p || p.status !== "ACTIVE" || !p.burnAfterRead) return { error: "This paste was already read and deleted." };
  if (p.passwordHash && p.userId !== user?.id) {
    const { hasGrant } = await import("@/lib/grant");
    if (!(await hasGrant("pw", p.id))) return { error: "Enter the password first." };
  }
  if (p.userId !== user?.id) {
    const deleted = await db.paste.deleteMany({ where: { id: p.id } });
    if (deleted.count === 0) return { error: "This paste was already read and deleted." };
  }
  if (p.format === "rich") {
    const { richToText, sanitizeRich } = await import("@/lib/rich");
    return { content: richToText(p.content), html: sanitizeRich(p.content), rich: true };
  }
  return { content: p.content, html: await highlight(p.content, p.language), rich: false };
}
