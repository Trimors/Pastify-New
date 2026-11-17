import Link from "next/link";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRY_OPTIONS } from "@/lib/pastes";
import { EARN, RATE_TIERS } from "@/lib/config";
import { Mark } from "@/components/Logo";
import { PasteEditor } from "@/components/editor/PasteEditor";
import { EarningsCard, StatsCard, ViewBadge } from "@/components/landing/HeroWidgets";
import { cloneAction, createPasteAction, loadTemplateAction } from "../(site)/new/actions";

export const dynamic = "force-dynamic";

function Arrow({ down }: { down?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`transition-transform duration-200 ${down ? "group-hover:translate-y-px" : "group-hover:translate-x-[3px]"}`}>
      {down ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M5 12h14M13 6l6 6-6 6" />}
    </svg>
  );
}

export default async function Home() {
  const user = await getUser();
  const [folders, templates] = user
    ? await Promise.all([
        db.folder.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } }),
        db.template.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true }, take: 50 }),
      ])
    : [[], []];

  return (
    <>
      {/* ── Paste right away ── */}
      <section id="new" className="pf-panel mt-2.5 scroll-mt-24 px-3 pb-6 pt-6 sm:px-6 sm:pt-8 lg:px-10">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="glass-pill text-rose">
              <span className="h-1.5 w-1.5 rounded-full bg-pink" /> New paste
            </span>
            <span className="hidden text-sm text-muted sm:inline">Free, no account needed.</span>
          </div>
          <Link href="/switch" className="glass-pill text-muted hover:text-paper">
            Moving from Paster? Start here →
          </Link>
        </div>
        <PasteEditor
          mode="create"
          action={createPasteAction}
          cloneAction={cloneAction}
          loadTemplateAction={loadTemplateAction}
          loggedIn={!!user}
          folders={folders.map((f) => f.name)}
          templates={templates}
          expiryOptions={EXPIRY_OPTIONS.map(({ id, label }) => ({ id, label }))}
        />
      </section>

      {/* ── Hero ── */}
      <section id="earn" data-anim className="pf-panel mt-2.5 scroll-mt-24 px-3 pb-6 pt-16 sm:px-8 sm:pb-10 sm:pt-20 lg:px-12">
        <div className="px-2 text-center">
          <span className="glass-pill font-medium">
            <Mark size={14} /> Pastebin for creators
          </span>
          <h1 className="mt-4 text-[clamp(2.75rem,9vw,6.25rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
            Paste. Share. <span className="text-gradient">Earn.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-muted sm:text-base">
            Share code, configs, notes and links. Turn on Earning and get paid for every unique view, at rates we publish.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 items-stretch gap-3 sm:mt-14 sm:gap-4 md:grid-cols-[1fr_1.9fr_1fr]">
          <div className="order-2 h-full md:order-1">
            <StatsCard />
          </div>

          <div className="order-1 h-full md:order-2">
            <div className="spot tilt glass-brand relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-[32px] p-6 sm:p-8">
              <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                <span className="pfa-sweep" />
              </span>
              <ViewBadge />
              <span className="pf-pill-on-brand self-start">
                <Mark size={14} /> How you earn
              </span>
              <p className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Paste. Share. Get paid.</p>
              <p className="mt-auto max-w-lg pt-8 text-sm leading-relaxed text-white/90 sm:text-base">
                Every paste gets its own short link. Turn on Earning and visitors read it straight away, no steps or waiting. Each unique view pays you, from ${RATE_TIERS[0].cpm.toFixed(2)} per 1,000.
              </p>
              <Link
                href={user ? "/dashboard" : "/signup"}
                className="group mt-5 inline-flex items-center gap-2 self-start rounded-full bg-white py-2.5 pl-4 pr-3 text-sm font-semibold text-[#3a1040] transition-transform duration-200 active:scale-[0.98]"
              >
                {user ? "Open your dashboard" : "Start earning"} <Arrow />
              </Link>
            </div>
          </div>

          <div className="order-3 h-full">
            <EarningsCard />
          </div>
        </div>
      </section>

      {/* ── Fact strip ── */}
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex shrink-0 -space-x-2" aria-hidden>
            {["P", "₮", "₿"].map((c) => (
              <span key={c} className="pf-fill-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#140c1b] text-xs font-semibold text-paper">{c}</span>
            ))}
          </div>
          <p className="text-xs leading-tight text-muted">
            {EARN.payoutMethods.length} payout methods
            <br />
            Cash out from ${EARN.payoutMinimumUsd}
          </p>
        </div>
        <a href="#how" className="group flex shrink-0 items-center gap-2 text-xs">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-paper text-[#0b0710]">
            <Arrow down />
          </span>
          Scroll down
        </a>
      </div>

      {/* ── How it works ── */}
      <section id="how" className="pf-panel scroll-mt-24 px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
        <div className="mt-8 grid gap-3 sm:gap-4 md:grid-cols-3">
          {[
            ["01", "Paste anything", "Code with highlighting, or rich text with headings, lists and links."],
            ["02", "Share it anywhere", "Short links with clean previews on Discord, X, Telegram and YouTube."],
            ["03", "Get paid", "Turn on Earning. Visitors open your paste straight away, and every unique view counts toward your payout."],
          ].map(([n, t, d]) => (
            <div key={n} className="spot tilt pf-tile p-2.5">
              <div className="pf-widget h-full p-6">
                <p className="font-mono text-sm text-rose">{n}</p>
                <p className="mt-3 text-lg font-semibold">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="pf-panel mt-2.5 px-4 py-12 sm:px-8 sm:py-16 lg:px-12">
        <div className="grid gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Built to be trusted</h2>
            <p className="mt-3 text-muted">The things creators ask other paste sites for, on day one.</p>
            <dl className="glass-tile mt-8 grid max-w-md grid-cols-3 gap-4 !rounded-2xl p-4 text-sm">
              {[
                [`$${RATE_TIERS[0].cpm.toFixed(2)}`, "Top CPM"],
                [`$${EARN.payoutMinimumUsd}`, "Payout minimum"],
                [`${EARN.payoutTargetDays} days`, "Payout target"],
              ].map(([k, v]) => (
                <div key={v}>
                  <dt className="font-mono text-lg font-medium">{k}</dt>
                  <dd className="text-xs text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <ul className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ["Public rates", "CPM for every country, on a public page. No guessing."],
              ["Clear payouts", `$${EARN.payoutMinimumUsd} minimum. PayPal or crypto. Every request and status in your dashboard.`],
              ["No waiting", "Pastes open straight away. No steps, no countdowns."],
              ["Real views only", "Server-checked views, bot filtering and one count per visitor per day."],
              ["A real editor", "Rich text or code, templates, clone from other pastebins, expiry, passwords, folders."],
              ["Your data, your way", "Raw and download on every paste, a documented API, and two-factor sign-in."],
            ].map(([t, d]) => (
              <li key={t} className="spot pf-widget flex gap-4 p-5">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gradient" />
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-muted">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing call to action ── */}
      <section className="glass-brand relative mt-2.5 overflow-hidden rounded-[32px] px-5 py-14 text-center sm:px-10 sm:py-20">
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <span className="pfa-sweep" />
        </span>
        <Mark size={56} animate className="mx-auto" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">Earn from every view of your pastes.</h2>
        <p className="mt-3 text-white/80">Free for creators. Set up in a minute.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={user ? "/dashboard" : "/signup"} className="group inline-flex items-center gap-2 rounded-full bg-white py-2.5 pl-5 pr-4 text-sm font-semibold text-[#3a1040]">
            {user ? "Open your dashboard" : "Create account"} <Arrow />
          </Link>
          <Link href="/earn" className="btn btn-secondary">See rates</Link>
        </div>
      </section>
    </>
  );
}
