"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticator } from "otplib";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { sha256 } from "@/lib/ids";
import { SITE_NAME } from "@/lib/config";

type S = { error?: string; ok?: string } | undefined;

export async function saveProfile(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  const displayName = String(form.get("displayName") || "").trim().slice(0, 40) || null;
  const bio = String(form.get("bio") || "").trim().slice(0, 280) || null;
  await db.user.update({
    where: { id: user.id },
    data: { displayName, bio },
  });
  revalidatePath("/dashboard/settings");
  return { ok: "Saved." };
}

export async function changePassword(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  const current = String(form.get("current") || "");
  const next = String(form.get("next") || "");
  if (!(await verifyPassword(current, user.passwordHash))) return { error: "Current password is wrong." };
  if (next.length < 8) return { error: "New password needs at least 8 characters." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  const raw = (await cookies()).get("pf_session")?.value;
  await db.session.deleteMany({ where: { userId: user.id, NOT: { id: sha256(raw ?? "") } } });
  return { ok: "Password changed. Other devices were signed out." };
}

export async function startTotp(): Promise<{ secret: string; qr: string }> {
  const user = await requireUser();
  const secret = authenticator.generateSecret();
  await db.user.update({ where: { id: user.id }, data: { totpSecret: secret, totpEnabled: false } });
  const uri = authenticator.keyuri(user.email, SITE_NAME, secret);
  return { secret, qr: await QRCode.toDataURL(uri, { margin: 1, width: 200, color: { dark: "#0B0710", light: "#F7F2FA" } }) };
}

export async function confirmTotp(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  const code = String(form.get("code") || "").replace(/\s/g, "");
  if (!user.totpSecret || !authenticator.check(code, user.totpSecret)) return { error: "That code didn't match. Try the next one." };
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
  revalidatePath("/dashboard/settings");
  return { ok: "Two-factor sign-in is on." };
}

export async function disableTotp(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  const code = String(form.get("code") || "").replace(/\s/g, "");
  if (!user.totpSecret || !authenticator.check(code, user.totpSecret)) return { error: "That code didn't match." };
  await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
  revalidatePath("/dashboard/settings");
  return { ok: "Two-factor sign-in is off." };
}

export async function signOutOthers() {
  const user = await requireUser();
  const raw = (await cookies()).get("pf_session")?.value;
  await db.session.deleteMany({ where: { userId: user.id, NOT: { id: sha256(raw ?? "") } } });
  revalidatePath("/dashboard/settings");
}

export async function deleteAccount(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  if (!(await verifyPassword(String(form.get("password") || ""), user.passwordHash))) return { error: "Password is wrong." };
  if (form.get("confirm") !== user.username) return { error: "Type your username to confirm." };
  await destroySession();
  await db.user.delete({ where: { id: user.id } });
  redirect("/");
}

export async function openPremiumPortal() {
  const user = await requireUser();
  const sub = await db.subscription.findFirst({ where: { userId: user.id, paddleCustomerId: { not: null } }, orderBy: { updatedAt: "desc" } });
  if (!sub?.paddleCustomerId) redirect("/dashboard/settings?portal=none#premium");
  const { portalUrl } = await import("@/lib/premium");
  const url = await portalUrl(sub.paddleCustomerId, sub.id);
  redirect(url ?? "/dashboard/settings?portal=error#premium");
}
