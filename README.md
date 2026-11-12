# Pastify

**Paste. Share. Earn.** A pastebin and link locker where creators earn from every unique unlock, at published rates.

Engineered by Trimors Technologies.

## What's in this version

**Pastes**
- Editor with line numbers, tab indent, Ctrl + Enter to save, language auto-detected from the file name
- Syntax highlighting for 30+ languages (Shiki, Pastify colour theme)
- Public, Unlisted and Private visibility
- **Earning** pastes: content is hidden until the visitor completes the unlock steps
- Expiry (10 minutes to 1 year), password protection, burn after reading (opened by an explicit click, so link-preview bots can't burn it)
- Folders, tags, description, raw view, download, copy
- Link previews (1200×630 images generated per paste)
- Anonymous pastes allowed; earning, private and folders need an account

**Link lockers**
- Title + target link, Light / Standard / Heavy step sets, optional extra wait
- Bulk create from CSV (up to 200 lines)
- **Extra destinations**: one locker, many links (`/l/{slug}?d={code}`), managed in the dashboard or the API
- The target address is never sent to the browser until the visitor has unlocked

**Unlock flow and anti-fraud**
- Steps are checked on the server: each step has a minimum time, steps must be done in order, and a parallel-request lock stops double counting
- Proof-of-work challenge (SHA-256, 16 bits) stops cheap scripted unlocks
- Optional Cloudflare Turnstile
- Headless browsers and bot user agents are blocked
- Each visitor counts once per item every 24 hours; owners' own visits never count
- Visitors are identified by a daily-rotating hash of IP + browser (no raw visitor IPs stored)
- Unlock grants are HMAC-signed cookies

**Creator dashboard**
- Overview: balance, views, unlocks, earnings, unlock rate, CPM, earnings per view
- Chart for today (hourly), 7 / 28 / 90 days and all time; switch between views, unlocks and earnings
- Breakdowns: top content, countries, sources (direct / links / search / social), referring sites, devices, browsers
- Per-item analytics page for every paste and locker
- Vault: best performing (by views, unlocks or earnings), searchable / sortable / paged table with 14-day sparklines, folder filter
- Earnings: available, in progress, paid out, lifetime; cashout requests; payout method (PayPal, USDT TRC-20, Bitcoin, Litecoin); daily activity log
- Referrals: custom link `/r/yourcode`, 5% commission paid by Pastify, referred-user table
- API keys (shown once, stored hashed, revocable)
- Settings: profile, password change (signs out other devices), two-factor sign-in (TOTP), active sessions, account deletion

**Public site**
- Landing page, Explore (search, language, tags, newest / trending), creator profiles `/u/name`
- Earn page with the **public rate table** and payout rules, Pricing, API docs
- Terms, Privacy, Content policy, Report abuse form
- `robots.txt` and `sitemap.xml`

**Admin** (`/admin`, for accounts with the ADMIN role)
- Pending cashouts: mark paid, or reject with a reason (money goes back to the creator's balance)
- Abuse reports: remove content or dismiss
- Users: search, suspend / restore, balance adjustments
- Content: search and remove / restore any paste or locker

**REST API** (`/api/v1`, bearer key, 120 requests/minute): `me`, `stats`, and full create / read / update / delete for pastes and lockers, plus locker destinations. Docs at `/docs/api`.

## Run it locally

Needs Node 20+ and Postgres 14+.

```bash
npm install
```

```bash
cp .env.example .env
```

Edit `.env`: set `DATABASE_URL`, and set `AUTH_SECRET` to the output of `openssl rand -hex 32`.

```bash
npx prisma migrate deploy
```

```bash
ADMIN_EMAIL=you@example.com npm run db:seed
```

The seed prints a generated admin password once (or set `ADMIN_PASSWORD`).

```bash
npm run dev
```

Open http://localhost:3000.

## Deploy (Vercel + a hosted Postgres)

1. Create a Postgres database (Neon, Supabase, Railway or similar) and copy its connection string.
2. Import this repository in Vercel.
3. Add environment variables (see `.env.example`):
   - `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`
   - `NEXT_PUBLIC_SITE_URL` = your domain, e.g. `https://pastify.example`
   - `IP_HEADER=x-forwarded-for` and `GEO_HEADER=x-vercel-ip-country`
   - `SPONSOR_URL` = your offer / smartlink URL(s), comma-separated
   - `NEXT_PUBLIC_AD_SCRIPT_URL` = your display-ad tag script (optional)
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` (optional, recommended)
4. Deploy. The build runs database migrations automatically.
5. Create your admin: run the seed command once against the production database.

Behind Cloudflare instead, use `IP_HEADER=cf-connecting-ip` and `GEO_HEADER=cf-ipcountry`.

**Important:** `GEO_HEADER` must be a header your host sets and visitors can't. If it's unset, every visitor is paid at the "rest of world" rate.

## Business settings to review before launch

All in `src/lib/config.ts`:

- **`RATE_TIERS`**: what creators earn per 1,000 unlocks for each country tier. These numbers are placeholders. Set them from your real ad/offer network revenue, keeping a margin. They're shown publicly on `/earn`.
- **`EARN`**: payout minimum ($5), cooldown (7 days), pending limit (2), payout target (5 business days), referral rate (5%), payout methods.

Also review:
- The legal pages in `src/app/(site)/legal/[page]/page.tsx` are a starting point written for this product. Have them checked by a lawyer for your country before launch.
- Payouts are **manual**: admins send the money (PayPal / wallet), then press "Mark paid".

## Not built yet (next steps)

- **Visitor Premium** (visitors pay to skip steps, creators get a revenue share): needs a Stripe or PayPal account
- **Emails** (welcome, payout paid/rejected, content removed): needs an email provider such as Resend or Postmark
- Automatic payouts through the PayPal Payouts API or a crypto payout provider
- World map on the dashboard
- Custom domains for creators' links
- Identity checks (KYC) before large payouts

## Project layout

```
prisma/schema.prisma        data model
src/lib/config.ts           rates and payout rules
src/lib/unlock.ts           unlock steps, proof-of-work, earnings credit
src/lib/stats.ts            dashboard analytics queries
src/app/(site)/             public pages (home, paste view /[slug], lockers /l/[slug], explore, earn…)
src/app/dashboard/          creator dashboard
src/app/admin/              admin panel
src/app/api/unlock/         unlock flow endpoints
src/app/api/v1/             public REST API
```
