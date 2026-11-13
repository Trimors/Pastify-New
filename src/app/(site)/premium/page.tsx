import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isPremium, paddleReady, PLANS, SHARE } from "@/lib/premium";
import { shortDate } from "@/lib/format";
import { PremiumCheckout } from "@/components/PremiumCheckout";
import { startCheckout } from "./actions";

export const metadata = { title: "Premium", description: "Skip every unlock and see no ads on Pastify." };

type SP = Promise<{ via?: string; ref?: string }>;

export default async function PremiumPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const via = sp.via && /^(paste|locker):[A-Za-z0-9_-]{3,32}$/.test(sp.via) ? sp.via : null;
  const ref = sp.ref && /^[a-z0-9]{3,32}$/.test(sp.ref) ? sp.ref : null;
  const user = await getUser();
  const active = isPremium(user);
  const qs = new URLSearchParams({ ...(via ? { via } : {}), ...(ref ? { ref } : {}) }).toString();
  const nextUrl = `/premium${qs ? `?${qs}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="label !text-rose">Pastify Premium</p>
      <h1 className="max-w-2xl text-5xl font-extrabold tracking-[-0.03em]">Skip every unlock.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">Open any paste or link straight away, with no steps, no waiting and no ads. Part of every payment goes to the creator who brought you here.</p>

      {active ? (
        <div className="card mt-10 p-6">
          <p className="font-semibold text-ok">You have Premium</p>
          <p className="mt-1 text-sm text-muted">Active until {shortDate(user!.premiumUntil!)}. Manage or cancel it from Settings.</p>
          <Link href="/dashboard/settings#premium" className="btn btn-secondary btn-sm mt-4">Manage Premium</Link>
        </div>
      ) : (
        <div className="mt-10">
          <PremiumCheckout
            plans={PLANS.map(({ id, label, perMonth, billed, every }) => ({ id, label, perMonth, billed, every }))}
            start={startCheckout}
            via={via}
            refCode={ref}
            loggedIn={!!user}
            enabled={paddleReady()}
            nextUrl={nextUrl}
          />
        </div>
      )}

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          ["No unlock steps", "Earning pastes and links open straight away."],
          ["No ads", "No ad slots or sponsor pages while you browse."],
          ["Supports creators", `Creators get ${SHARE.basePct}–${SHARE.boostedPct}% of what we receive from your plan.`],
        ].map(([t, d]) => (
          <div key={t} className="card p-5">
            <p className="font-semibold">{t}</p>
            <p className="mt-1 text-sm text-muted">{d}</p>
          </div>
        ))}
      </section>

      <p className="mt-10 text-sm text-muted">
        Payments are handled by Paddle, our reseller, who also handles tax and receipts. Plans renew automatically at the price shown until you cancel. You can cancel any time from Settings and keep Premium until the end of the period you paid for. See the{" "}
        <Link href="/legal/terms" className="text-rose hover:underline">Terms</Link>.
      </p>
    </div>
  );
}
