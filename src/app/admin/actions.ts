"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { settlePayout } from "@/lib/payouts";
import { usdToMicros } from "@/lib/money";

export async function markPaid(id: string) {
  await requireAdmin();
  await settlePayout(id, "PAID");
  revalidatePath("/admin");
}

export async function rejectPayout(id: string, form: FormData) {
  await requireAdmin();
  await settlePayout(id, "REJECTED", String(form.get("note") || "Rejected") .slice(0, 200));
  revalidatePath("/admin");
}

export async function setContentStatus(kind: "PASTE" | "LOCKER", slug: string, status: "ACTIVE" | "REMOVED") {
  await requireAdmin();
  if (kind === "PASTE") await db.paste.updateMany({ where: { slug }, data: { status } });
  else await db.locker.updateMany({ where: { slug }, data: { status } });
  if (status === "REMOVED") await db.report.updateMany({ where: { slug, status: "OPEN" }, data: { status: "RESOLVED" } });
  revalidatePath("/admin");
  revalidatePath("/admin/content");
}

export async function dismissReport(id: string) {
  await requireAdmin();
  await db.report.update({ where: { id }, data: { status: "DISMISSED" } });
  revalidatePath("/admin");
}

export async function setUserStatus(id: string, status: "ACTIVE" | "SUSPENDED") {
  const admin = await requireAdmin();
  if (admin.id === id) return;
  await db.user.update({ where: { id }, data: { status } });
  if (status === "SUSPENDED") await db.session.deleteMany({ where: { userId: id } });
  revalidatePath("/admin/users");
}

export async function adjustBalance(id: string, form: FormData) {
  await requireAdmin();
  const amount = Number(form.get("amount"));
  if (!Number.isFinite(amount) || amount === 0) return;
  await db.ledgerEntry.create({ data: { userId: id, type: "ADJUSTMENT", amountMicros: usdToMicros(amount), note: String(form.get("note") || "").slice(0, 200) || null } });
  revalidatePath("/admin/users");
}
