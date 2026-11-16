import { json, withApi } from "@/lib/api";
import { overview, PERIODS } from "@/lib/stats";

export const GET = withApi(async (req, user) => {
  const p = new URL(req.url).searchParams.get("period") ?? "28d";
  const period = PERIODS.some((x) => x.id === p) ? p : "28d";
  const s = await overview(user.id, period);
  return json({
    data: {
      period,
      views: s.views,
      unlocks: s.unlocks,
      earningsUsd: Number(s.earnings) / 1e6,
      unlockRate: s.unlockRate,
      cpmUsd: Number(s.cpm) / 1e6,
      epvUsd: Number(s.epv) / 1e6,
    },
  });
});
