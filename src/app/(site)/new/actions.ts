"use server";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { clientIp, getUser } from "@/lib/auth";
import { createPaste, updatePaste } from "@/lib/pastes";
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
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/${slug}?created=1`);
}

export async function updatePasteAction(id: string, _: PasteState, form: FormData): Promise<PasteState> {
  const user = await getUser();
  if (!user) return { error: "Log in again." };
  let slug: string;
  try {
    const p = await updatePaste(id, Object.fromEntries(form), user.id);
    slug = p.slug;
  } catch (e) {
    return { error: message(e) };
  }
  redirect(`/${slug}?saved=1`);
}
