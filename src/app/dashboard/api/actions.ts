"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createApiKey } from "@/lib/apikeys";

export async function newKey(_: { error?: string; key?: string } | undefined, form: FormData) {
  const user = await requireUser();
  const count = await db.apiKey.count({ where: { userId: user.id } });
  if (count >= 10) return { error: "Up to 10 keys. Revoke one first." };
  const key = await createApiKey(user.id, String(form.get("name") || "").slice(0, 40));
  revalidatePath("/dashboard/api");
  return { key };
}

export async function revokeKey(id: string) {
  const user = await requireUser();
  await db.apiKey.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/api");
}
