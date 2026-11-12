export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "Pastify";
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

/** Revenue model. Edit these to match your ad / offer network deals. */
export const EARN = {
  /** Smallest balance a creator can cash out, in USD. */
  payoutMinimumUsd: 5,
  /** Days between cashout requests. */
  payoutCooldownDays: 7,
  /** Most cashouts a creator can have pending at once. */
  maxPendingPayouts: 2,
  /** Target payout time, in business days. Shown publicly. */
  payoutTargetDays: 5,
  /** Referrers earn this share of their referrals' earnings, paid by Pastify. */
  referralRate: 0.05,
  /** A visitor only counts once per item in this window. */
  uniqueWindowHours: 24,
  payoutMethods: [
    { id: "paypal", label: "PayPal", placeholder: "you@example.com" },
    { id: "usdt_trc20", label: "USDT (TRC-20)", placeholder: "T…" },
    { id: "btc", label: "Bitcoin", placeholder: "bc1…" },
    { id: "ltc", label: "Litecoin", placeholder: "ltc1…" },
  ],
} as const;

/**
 * Creator CPM (USD paid to the creator per 1,000 unique unlocks) by tier.
 * These are shown on the public rates page, so keep them honest.
 */
export const RATE_TIERS = [
  {
    id: "t1",
    name: "Tier 1",
    cpm: 6.0,
    countries: ["US", "GB", "CA", "AU", "NZ", "DE", "NL", "SE", "NO", "DK", "CH", "IE", "FI", "AT", "BE"],
  },
  {
    id: "t2",
    name: "Tier 2",
    cpm: 3.0,
    countries: ["FR", "IT", "ES", "PT", "JP", "KR", "SG", "AE", "SA", "IL", "PL", "CZ", "HK", "TW", "QA", "KW"],
  },
  {
    id: "t3",
    name: "Tier 3",
    cpm: 1.5,
    countries: ["BR", "MX", "AR", "CL", "CO", "ZA", "TR", "RO", "HU", "GR", "MY", "TH", "RU", "UA", "SK", "HR"],
  },
  { id: "t4", name: "Rest of world", cpm: 0.6, countries: [] as string[] },
] as const;

export function tierFor(country: string) {
  return RATE_TIERS.find((t) => (t.countries as readonly string[]).includes(country)) ?? RATE_TIERS[RATE_TIERS.length - 1];
}

/** Earning for one unique unlock in micro-dollars (1 USD = 1,000,000). */
export function earningMicrosFor(country: string): bigint {
  return BigInt(Math.round((tierFor(country).cpm / 1000) * 1_000_000));
}
