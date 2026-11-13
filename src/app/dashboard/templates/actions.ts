"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { richToText, sanitizeRich } from "@/lib/rich";

export async function saveTemplate(id: string | null, _: { error?: string } | undefined, form: FormData) {
  const user = await requireUser();
  const title = String(form.get("title") || "").trim().slice(0, 80);
  const format = form.get("format") === "code" ? "code" : "rich";
  const raw = String(form.get("content") || "");
  const content = format === "rich" ? sanitizeRich(raw) : raw;
  if (!title) return { error: "Give the template a name." };
  if (!(format === "rich" ? richToText(content) : content).trim()) return { error: "Template is empty." };
  if (Buffer.byteLength(content) > 256 * 1024) return { error: "Templates can be up to 256 KB." };
  if (id) {
    const res = await db.template.updateMany({ where: { id, userId: user.id }, data: { title, format, content } });
    if (!res.count) return { error: "Template not found." };
  } else {
    if ((await db.template.count({ where: { userId: user.id } })) >= 50) return { error: "Up to 50 templates." };
    await db.template.create({ data: { userId: user.id, title, format, content } });
  }
  revalidatePath("/dashboard/templates");
  redirect("/dashboard/templates");
}

export async function deleteTemplate(id: string) {
  const user = await requireUser();
  await db.template.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/templates");
}
