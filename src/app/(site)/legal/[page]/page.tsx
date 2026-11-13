import { notFound } from "next/navigation";
import { EARN, SITE_NAME } from "@/lib/config";

const UPDATED = "12 November 2026";

const PAGES: Record<string, { title: string; body: [string, string][] }> = {
  terms: {
    title: "Terms of Service",
    body: [
      ["Who can use Pastify", `You must be 18 or older to create an account. One account per person unless we agree otherwise in writing.`],
      ["Your content", `You own what you post. You give ${SITE_NAME} permission to store, display and deliver it so the service works. You are responsible for having the right to share it.`],
      ["Earning", `Creators earn for unique, human unlocks at the rates on the Earn page. Rates can change; we post changes there first. Earnings from invalid traffic (bots, scripts, paid or incentivised clicks, self-clicks) are not paid and may be reversed.`],
      ["Payouts", `Cashouts are available from $${EARN.payoutMinimumUsd}. We aim to pay within ${EARN.payoutTargetDays} business days. We may ask you to verify your identity before paying. If we reject a cashout, the amount goes back to your balance and we tell you why.`],
      ["Premium", "Premium is a subscription for visitors that skips unlock steps and ads. Paddle.com is our reseller and merchant of record: it processes payments, charges any tax and issues receipts. Plans renew automatically at the price shown at checkout until cancelled. You can cancel any time from Settings; you keep Premium until the end of the period you paid for."],
      ["Refunds", "If Premium doesn't work for you, ask for a refund within 14 days of a payment and we'll refund it. Refunds are processed by Paddle. A full refund ends Premium access."],
      ["Premium sales for creators", "Creators get 50% of the plan price (before tax) for Premium sales and renewals they bring in, and 70% from their 6th sale in a UTC day. Refunded or charged-back sales are taken back from the creator's balance in proportion."],
      ["Suspension", "We can suspend accounts that break these terms or the content policy. When we do, we tell you which rule was broken. Earnings from legitimate traffic before a suspension for unrelated reasons are still paid."],
      ["API", "Keep your API keys secret. Don't use the API to get around limits or to create content that breaks the content policy."],
      ["No warranty", `${SITE_NAME} is provided as is. We can't promise data will never be lost. Keep your own copies of anything important.`],
      ["Changes", "We'll post changes to these terms here, with the new date, before they take effect."],
    ],
  },
  privacy: {
    title: "Privacy Policy",
    body: [
      ["What we collect", "Account: email, username, password hash, payout details. Visitors: country (from IP), device type, browser and referring site. We store a daily-rotating hash of IP and browser to count unique visits, never the raw IP for visitors."],
      ["Why", "To run the service, count views and unlocks fairly, stop fraud, and pay creators."],
      ["Sharing", "We share data only with the providers that run the service (hosting, payments, ad and offer partners) and when the law requires it. We don't sell personal data."],
      ["Cookies", "A session cookie keeps you signed in. Short-lived cookies remember which items you've unlocked. Sponsors shown during unlocks may set their own cookies."],
      ["Your rights", "You can delete your account from Settings. Contact us for a copy of your data or anything else about it."],
    ],
  },
  content: {
    title: "Content Policy",
    body: [
      ["Not allowed", "Malware, phishing, credential stealers or anything that harms visitors' devices or accounts. Illegal content of any kind, including any sexual content involving minors. Other people's private data (doxxing). Content that infringes copyright. Spam, scams and fake giveaways."],
      ["Traffic", "No bots, automated unlocks, paid-to-click traffic, or tricking people into unlocking. Don't lock links that just lead to another locker."],
      ["What happens", "We remove content that breaks these rules. Earnings from removed content are not paid. Repeated or serious breaks lead to suspension."],
      ["Reporting", "Use the Report link on any paste or locker, or the Report abuse page. We review every report."],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  const p = PAGES[(await params).page];
  return { title: p?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ page: string }> }) {
  const p = PAGES[(await params).page];
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">{p.title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated {UPDATED}</p>
      <div className="mt-8 space-y-6">
        {p.body.map(([h, t]) => (
          <section key={h}>
            <h2 className="text-lg font-semibold">{h}</h2>
            <p className="mt-1 text-muted">{t}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
