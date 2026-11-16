"use server";
import { getUser } from "@/lib/auth";
import { PLANS, paddleReady, priceIdFor, resolveCreator, signCheckout, type PlanId } from "@/lib/premium";

/** Returns what Paddle.js needs to open checkout, with signed creator attribution. */
export async function startCheckout(plan: string, via: string | null, ref: string | null) {
  const user = await getUser();
  if (!user) return { error: "login" as const };
  if (!paddleReady()) return { error: "Premium checkout isn't switched on yet." };
  if (!PLANS.some((p) => p.id === plan)) return { error: "Pick a plan." };
  const priceId = priceIdFor(plan as PlanId);
  if (!priceId) return { error: "That plan isn't available." };
  const creatorId = await resolveCreator(via, ref, user.id);
  return { priceId, email: user.email, customData: signCheckout(user.id, creatorId) };
}
