import Link from "next/link";
import { EARN, RATE_TIERS } from "@/lib/config";
import { countryName, flag } from "@/lib/geo";

export const metadata = { title: "Earn", description: "Published rates, clear payout rules. Earn from every unlock." };

const FAQ: [string, string][] = [
  ["How do Premium sales pay?", "Visitors can buy Premium to skip unlocks. When they buy from your unlock page or your Premium link, you get 50% of what Pastify receives (after tax and payment fees) from that sale and every renewal, and 70% from your 6th sale of the day (UTC). Premium visitors open your pastes without unlocking, so those views don't add unlock earnings."],
  ["What counts as an unlock?", `A real visitor who finishes every step. Each visitor counts once per item every ${EARN.uniqueWindowHours} hours. Bots, scripts and your own visits don't count.`],
  ["What do visitors have to do?", "A short check, then usually a sponsor visit. You pick Light, Standard or Heavy steps for each locker. Earning pastes use Standard."],
  ["When do I get paid?", `Request a cashout from $${EARN.payoutMinimumUsd}. We aim to pay within ${EARN.payoutTargetDays} business days and show every request's status in your dashboard.`],
  ["How do I get paid?", `${EARN.payoutMethods.map((m) => m.label).join(", ")}.`],
  ["Do referrals pay?", `Yes. You get ${EARN.referralRate * 100}% of what creators you invite earn, for as long as they earn. It's paid by Pastify, not taken from them.`],
  ["What isn't allowed?", "Malware, phishing, illegal content, other people's private data, and buying or faking traffic. Breaking the rules removes the earnings from that content."],
];

export default function EarnPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="max-w-2xl">
        <p className="label !text-rose">For creators</p>
        <h1 className="text-5xl font-extrabold tracking-[-0.03em]">Earn from every view of your pastes.</h1>
        <p className="mt-4 text-lg text-muted">Share a link anywhere. Visitors take a few quick steps to unlock it, and you get paid per unique unlock at the rates below.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/signup" className="btn btn-primary">Start earning</Link>
          <Link href="/new" className="btn btn-secondary">Create paste</Link>
        </div>
      </div>

      <section id="rates" className="mt-16 scroll-mt-20">
        <h2 className="text-3xl font-bold tracking-tight">Rates</h2>
        <p className="mt-2 text-muted">What you earn per 1,000 unique unlocks, by the visitor&apos;s country. Rates can change; changes are posted here first.</p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {RATE_TIERS.map((t) => (
            <div key={t.id} className="card p-5">
              <p className="label">{t.name}</p>
              <p className="font-mono text-3xl">${t.cpm.toFixed(2)}</p>
              <p className="text-xs text-muted">CPM · ${(t.cpm / 1000).toFixed(4)} per unlock</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {t.countries.length ? (
                  t.countries.map((c) => (
                    <span key={c} title={countryName(c)} className="chip !px-2">{flag(c)} {c}</span>
                  ))
                ) : (
                  <span className="text-sm text-muted">Every other country</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-4">
        {[
          [`$${EARN.payoutMinimumUsd}`, "Minimum cashout"],
          [`${EARN.payoutTargetDays} days`, "Payout target"],
          [`${EARN.referralRate * 100}%`, "Referral commission"],
          ["$0", "Cost to creators"],
        ].map(([k, v]) => (
          <div key={v} className="card p-5">
            <p className="font-mono text-3xl text-gradient">{k}</p>
            <p className="mt-1 text-sm text-muted">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-3xl font-bold tracking-tight">Questions</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {FAQ.map(([q, a]) => (
            <div key={q} className="card p-5">
              <p className="font-semibold">{q}</p>
              <p className="mt-1 text-sm text-muted">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
