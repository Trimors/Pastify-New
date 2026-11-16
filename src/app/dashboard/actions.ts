"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function deletePaste(id: string) {
  const user = await requireUser();
  await db.paste.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/vault");
}
