import { json, withApi } from "@/lib/api";
import { balanceOf } from "@/lib/unlock";

export const GET = withApi(async (_req, user) => {
  const balance = await balanceOf(user.id);
  return json({ data: { username: user.username, balanceUsd: Number(balance) / 1e6, createdAt: user.createdAt.toISOString() } });
});
