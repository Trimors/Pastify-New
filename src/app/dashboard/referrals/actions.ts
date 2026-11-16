"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function setReferralCode(_: { error?: string; ok?: string } | undefined, form: FormData) {
  const user = await requireUser();
  const code = String(form.get("code") || "").trim().toLowerCase();
  if (!/^[a-z0-9]{3,32}$/.test(code)) return { error: "3–32 lowercase letters or numbers." };
  const taken = await db.user.findFirst({ where: { referralCode: code, NOT: { id: user.id } }, select: { id: true } });
  if (taken) return { error: "That code is taken." };
  await db.user.update({ where: { id: user.id }, data: { referralCode: code } });
  revalidatePath("/dashboard/referrals");
  return { ok: "Referral link updated." };
}
