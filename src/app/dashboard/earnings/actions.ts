"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EARN } from "@/lib/config";
import { requestPayout } from "@/lib/payouts";

type S = { error?: string; ok?: string } | undefined;

export async function savePayoutMethod(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  const method = String(form.get("method") || "");
  const destination = String(form.get("destination") || "").trim();
  if (!EARN.payoutMethods.some((m) => m.id === method)) return { error: "Pick a payout method." };
  if (method === "paypal" && !z.string().email().safeParse(destination).success) return { error: "Enter your PayPal email." };
  if (method !== "paypal" && !/^[A-Za-z0-9:]{20,120}$/.test(destination)) return { error: "That wallet address doesn't look right." };
  await db.user.update({ where: { id: user.id }, data: { payoutMethod: method, payoutDestination: destination } });
  revalidatePath("/dashboard/earnings");
  return { ok: "Payout method saved." };
}

export async function cashout(_: S, form: FormData): Promise<S> {
  const user = await requireUser();
  try {
    await requestPayout(user.id, Number(form.get("amount")));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Cashout failed." };
  }
  revalidatePath("/dashboard/earnings");
  return { ok: "Cashout requested." };
}
