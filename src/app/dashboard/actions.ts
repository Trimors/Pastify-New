"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addLockerTarget, createLocker, updateLocker } from "@/lib/lockers";
import { rateLimit } from "@/lib/ratelimit";

function msg(e: unknown) {
  if (e instanceof ZodError) return e.issues[0]?.message ?? "Check the form.";
  return e instanceof Error ? e.message : "Something failed.";
}

export async function deleteItem(kind: "paste" | "locker", id: string) {
  const user = await requireUser();
  if (kind === "paste") await db.paste.deleteMany({ where: { id, userId: user.id } });
  else await db.locker.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/dashboard/vault");
}

export async function createLockerAction(_: { error?: string } | undefined, form: FormData) {
  const user = await requireUser();
  if (!(await rateLimit(`locker:${user.id}`, 100, 3600))) return { error: "Too many lockers this hour." };
  let id: string;
  try {
    id = (await createLocker(Object.fromEntries(form), user.id)).id;
  } catch (e) {
    return { error: msg(e) };
  }
  redirect(`/dashboard/lockers/${id}?created=1`);
}

export async function bulkCreateLockers(_: { error?: string; created?: number } | undefined, form: FormData) {
  const user = await requireUser();
  const csv = String(form.get("csv") || "");
  const intensity = String(form.get("intensity") || "standard");
  const rows = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && /^title\s*,\s*(url|target)/i.test(l)));
  if (!rows.length) return { error: "Add at least one line: title,https://link" };
  if (rows.length > 200) return { error: "Up to 200 lines at a time." };
  if (!(await rateLimit(`locker:${user.id}`, 400, 3600))) return { error: "Too many lockers this hour." };
  let created = 0;
  for (const [i, line] of rows.entries()) {
    const idx = line.lastIndexOf(",");
    const title = line.slice(0, idx).replace(/^"|"$/g, "").trim();
    const targetUrl = line.slice(idx + 1).replace(/^"|"$/g, "").trim();
    try {
      await createLocker({ title, targetUrl, intensity }, user.id);
      created++;
    } catch (e) {
      return { error: `Line ${i + 1}: ${msg(e)}`, created };
    }
  }
  revalidatePath("/dashboard/vault");
  return { created };
}

export async function updateLockerAction(id: string, _: { error?: string; ok?: boolean } | undefined, form: FormData) {
  const user = await requireUser();
  try {
    await updateLocker(id, Object.fromEntries(form), user.id);
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/dashboard/lockers/${id}`);
  return { ok: true };
}

export async function addTargetAction(lockerId: string, _: { error?: string; ok?: string } | undefined, form: FormData) {
  const user = await requireUser();
  try {
    await addLockerTarget(lockerId, user.id, { url: form.get("url"), label: form.get("label") });
  } catch (e) {
    return { error: msg(e) };
  }
  revalidatePath(`/dashboard/lockers/${lockerId}`);
  return { ok: "Destination added." };
}

export async function deleteTargetAction(lockerId: string, id: string) {
  const user = await requireUser();
  await db.lockerTarget.deleteMany({ where: { id, locker: { id: lockerId, userId: user.id } } });
  revalidatePath(`/dashboard/lockers/${lockerId}`);
}
