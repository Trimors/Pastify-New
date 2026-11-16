"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: string; label: string; perMonth: number; billed: number; every: string };
type Start = (plan: string, via: string | null, ref: string | null) => Promise<{ error?: string; priceId?: string; email?: string; customData?: Record<string, string> }>;

declare global {
  interface Window {
    Paddle?: {
      Environment: { set: (e: string) => void };
      Initialize: (o: { token: string; eventCallback?: (e: { name: string }) => void }) => void;
      Checkout: { open: (o: Record<string, unknown>) => void };
    };
  }
}

const TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || "";
const ENV = process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";

export function PremiumCheckout({ plans, start, via, refCode, loggedIn, enabled, nextUrl }: { plans: Plan[]; start: Start; via: string | null; refCode: string | null; loggedIn: boolean; enabled: boolean; nextUrl: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!enabled || !TOKEN) return;
    if (window.Paddle) return setReady(true);
    const s = document.createElement("script");
    s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    s.async = true;
    s.onload = () => {
      if (!window.Paddle) return;
      if (ENV === "sandbox") window.Paddle.Environment.set("sandbox");
      window.Paddle.Initialize({
        token: TOKEN,
        eventCallback: (e) => {
          if (e.name === "checkout.completed") {
            setDone(true);
            // Access is granted by the webhook; give it a moment, then refresh.
            setTimeout(() => router.refresh(), 4000);
          }
        },
      });
      setReady(true);
    };
    document.head.appendChild(s);
  }, [enabled, router]);

  async function buy(plan: string) {
    setErr(null);
    if (!loggedIn) {
      router.push(`/signup?next=${encodeURIComponent(nextUrl)}`);
      return;
    }
    setBusy(plan);
    const r = await start(plan, via, refCode);
    setBusy(null);
    if (r.error === "login") return router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
    if (r.error) return setErr(r.error);
    if (!window.Paddle) return setErr("Checkout didn't load. Turn off blockers for this page and try again.");
    window.Paddle.Checkout.open({
      items: [{ priceId: r.priceId, quantity: 1 }],
      customer: { email: r.email },
      customData: r.customData,
      settings: { displayMode: "overlay", theme: "dark", allowLogout: false },
    });
  }

  return (
    <div>
      {done && <p className="mb-6 rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm text-ok">Payment received. Premium switches on within a minute.</p>}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => {
          const best = p.id === "yearly";
          return (
            <div key={p.id} className={`card relative flex flex-col p-6 ${best ? "border-magenta/50" : ""}`}>
              {best && <span className="chip chip-earning absolute right-4 top-4">Best value</span>}
              <p className="label">{p.label}</p>
              <p className="font-mono text-4xl">${p.perMonth.toFixed(2)}<span className="text-base text-muted">/mo</span></p>
              <p className="mt-1 flex-1 text-sm text-muted">
                {p.every === "month" ? "Billed monthly." : `$${p.billed.toFixed(2)} billed every ${p.every}.`} Renews at the same price. Cancel any time.
              </p>
              <button onClick={() => buy(p.id)} disabled={!!busy || !enabled || (loggedIn && !ready)} className={`btn mt-6 ${best ? "btn-primary" : "btn-secondary"}`}>
                {!enabled ? "Coming soon" : busy === p.id ? "Opening…" : loggedIn ? `Get ${p.label}` : "Sign up to continue"}
              </button>
            </div>
          );
        })}
      </div>
      {err && <p className="mt-4 text-sm text-bad">{err}</p>}
    </div>
  );
}
