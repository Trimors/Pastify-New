import Link from "next/link";
import { Mark } from "@/components/Logo";
import { EARN, RATE_TIERS, SITE_HOST } from "@/lib/config";

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient opacity-[0.12] blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:pt-24">
          <div>
            <p className="label !text-rose">Paste · Share · Earn</p>
            <h1 className="mt-3 text-5xl font-extrabold leading-[1.02] tracking-[-0.04em] sm:text-6xl">
              Paste once.
              <br />
              <span className="text-gradient">Earn forever.</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted">
              Share code, configs, notes and links. Turn on Earning and get paid for every unique unlock, at rates we publish.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/new" className="btn btn-primary">Create paste</Link>
              <Link href="/signup" className="btn btn-secondary">Start earning</Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
              <Stat k={`$${RATE_TIERS[0].cpm.toFixed(2)}`} v="Top CPM" />
              <Stat k={`$${EARN.payoutMinimumUsd}`} v="Payout minimum" />
              <Stat k={`${EARN.payoutTargetDays} days`} v="Payout target" />
            </dl>
          </div>
          <HeroCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Step n="01" t="Paste or lock a link" d="Code with highlighting, plain text, or any link you want behind a locker." />
          <Step n="02" t="Share it anywhere" d="Short links with clean previews on Discord, X, Telegram and YouTube." />
          <Step n="03" t="Get paid" d="Visitors take a few quick steps to unlock. Every unique unlock counts toward your payout." />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Built to be trusted</h2>
            <p className="mt-3 text-muted">The things creators ask other lockers for, on day one.</p>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              ["Public rates", "CPM for every country, on a public page. No guessing."],
              ["Clear payouts", `$${EARN.payoutMinimumUsd} minimum. PayPal or crypto. Every request and status in your dashboard.`],
              ["Your steps, your choice", "Pick light, standard or heavy unlocks for each link."],
              ["Real views only", "Server-checked steps, bot filtering and one count per visitor per day."],
              ["Pastes, not just links", "Syntax highlighting, expiry, passwords, burn after reading, folders."],
              ["Secure accounts", "Two-factor sign-in and API keys you can revoke."],
            ].map(([t, d]) => (
              <li key={t} className="card flex gap-4 p-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient" />
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="card relative overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient opacity-[0.07]" />
          <Mark size={56} animate className="mx-auto" />
          <h2 className="mt-4 text-3xl font-bold tracking-tight">Earn from every view of your pastes.</h2>
          <p className="mt-2 text-muted">Free for creators. Set up in a minute.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/signup" className="btn btn-primary">Create account</Link>
            <Link href="/earn" className="btn btn-secondary">See rates</Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-lg font-medium text-paper">{k}</dt>
      <dd className="text-xs text-muted">{v}</dd>
    </div>
  );
}

function Step({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="card p-6">
      <p className="font-mono text-sm text-rose">{n}</p>
      <p className="mt-3 text-lg font-semibold">{t}</p>
      <p className="mt-1 text-sm text-muted">{d}</p>
    </div>
  );
}

function HeroCard() {
  const lines = [
    ["local", " settings = {"],
    ["  theme", ' = "magenta",'],
    ["  autosave", " = true,"],
    ["  expiry", ' = "7d"'],
    ["}", ""],
    ["return", " settings"],
  ];
  return (
    <div className="relative">
      <div className="card overflow-hidden shadow-2xl shadow-magenta/10">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="font-mono text-sm">config.lua</span>
          <span className="chip chip-earning"><span className="h-1.5 w-1.5 rounded-full bg-pink" /> Earning</span>
        </div>
        <pre className="px-2 py-4 font-mono text-[13px] leading-7">
          {lines.map(([a, b], i) => (
            <div key={i} className="flex">
              <span className="w-10 pr-4 text-right text-[#5b4d68]">{i + 1}</span>
              <span>
                <span className={a === "local" || a === "return" ? "text-pink" : "text-[#D13BD0]"}>{a}</span>
                <span className={b.includes('"') ? "text-rose" : b.includes("true") ? "text-[#C79BFF]" : ""}>{b}</span>
              </span>
            </div>
          ))}
        </pre>
      </div>
      <div className="card absolute -bottom-8 -right-2 w-64 p-4 shadow-2xl sm:-right-6">
        <p className="text-sm font-semibold">Your paste is live</p>
        <div className="mt-2 flex items-center justify-between rounded-lg border border-line bg-ink px-3 py-2">
          <span className="truncate font-mono text-xs">{SITE_HOST}/x8Kq2</span>
          <span className="text-xs font-semibold text-rose">Copy</span>
        </div>
      </div>
    </div>
  );
}
