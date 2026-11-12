import "server-only";
import { db } from "./db";
import { EARN } from "./config";
import { usdToMicros } from "./money";

export async function requestPayout(userId: string, amountUsd: number) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Account not found.");
  if (!user.payoutMethod || !user.payoutDestination) throw new Error("Add a payout method first.");
  const amount = usdToMicros(amountUsd);
  if (!Number.isFinite(amountUsd) || amount < usdToMicros(EARN.payoutMinimumUsd)) throw new Error(`Minimum cashout is $${EARN.payoutMinimumUsd}.`);

  return db.$transaction(async (tx) => {
    // Serialise payout requests per user so the balance can't be spent twice.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;
    const agg = await tx.ledgerEntry.aggregate({ where: { userId }, _sum: { amountMicros: true } });
    const balance = agg._sum.amountMicros ?? 0n;
    if (amount > balance) throw new Error("That's more than your balance.");
    const pending = await tx.payout.count({ where: { userId, status: "PENDING" } });
    if (pending >= EARN.maxPendingPayouts) throw new Error(`You already have ${pending} cashouts in progress.`);
    const last = await tx.payout.findFirst({ where: { userId, status: { not: "REJECTED" } }, orderBy: { createdAt: "desc" } });
    if (last && Date.now() - last.createdAt.getTime() < EARN.payoutCooldownDays * 864e5) {
      const next = new Date(last.createdAt.getTime() + EARN.payoutCooldownDays * 864e5);
      throw new Error(`One cashout every ${EARN.payoutCooldownDays} days. Next one from ${next.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}.`);
    }
    const payout = await tx.payout.create({
      data: { userId, amountMicros: amount, method: user.payoutMethod!, destination: user.payoutDestination! },
    });
    await tx.ledgerEntry.create({ data: { userId, type: "PAYOUT", amountMicros: -amount, refId: payout.id } });
    return payout;
  });
}

export async function settlePayout(id: string, status: "PAID" | "REJECTED", note?: string) {
  return db.$transaction(async (tx) => {
    const p = await tx.payout.findUnique({ where: { id } });
    if (!p || p.status !== "PENDING") throw new Error("Payout is not pending.");
    await tx.payout.update({ where: { id }, data: { status, note: note || null, processedAt: new Date() } });
    if (status === "REJECTED") {
      await tx.ledgerEntry.create({ data: { userId: p.userId, type: "PAYOUT_REVERSAL", amountMicros: p.amountMicros, refId: p.id, note: note || null } });
    }
  });
}
