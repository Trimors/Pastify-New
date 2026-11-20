# Pastify

**Paste. Share. Earn.** A pastebin where creators earn from every unique view of their pastes, at published rates.

Engineered by Trimors Technologies.

## What's in this version

**Pastes**
- Two formats: **Rich text** (headings, bold/italic/underline, lists, quotes, code blocks, links, alignment, Markdown-style shortcuts) and **Code** (line numbers, syntax highlighting)
- Rich text is sanitized on save and on display, so pasted or API-sent HTML can't run scripts
- **Templates** for posts you write often, inserted from the editor
- **Clone** from a Pastify link or ID, Pastebin, Rentry, GitHub Gist, paste.ee or dpaste (fixed list of hosts only)
- **Edit codes**: anonymous pastes get one (shown once), and logged-in creators can set one so others can edit without their account
- Keyboard shortcuts on pastes (E edit, C copy, Q copy link, R raw, Shift+T/R/X share, ? help) and share buttons for Telegram, Reddit, X and WhatsApp
- Code editor with line numbers, tab indent, Ctrl + Enter to save, language auto-detected from the file name
- Syntax highlighting for 30+ languages (Shiki, Pastify colour theme)
- Public, Unlisted and Private visibility
- **Earning** pastes open straight away (no steps or waiting); an ad shows beside them and the creator is paid per unique view
- Expiry (10 minutes to 1 year), password protection, burn after reading (opened by an explicit click, so link-preview bots can't burn it)
- Folders, tags, description, raw view, download, copy
- Link previews (1200×630 images generated per paste)
- Anonymous pastes allowed; earning, private and folders need an account

**Paid views and anti-fraud**
- Every paste opens straight away, with no steps or waiting
- A paid view counts once the page has been visible for 5 seconds and a silent background proof-of-work (14 bits) is solved; the page carries a signed, time-stamped token so early or forged requests are rejected
- Headless browsers and bot user agents are not paid
- One IP address counts once per paste in any rolling 24 hours, for views and earnings (IPv6 counted per /64 block, since providers hand out whole blocks); owners' own views never count
- IPs are stored only as a one-way keyed hash, never raw; a lock per paste and IP stops simultaneous requests from counting twice

**Creator dashboard**
- Overview: balance, views, paid views, earnings, paid view rate, CPM, earnings per view
- Chart for today (hourly), 7 / 28 / 90 days and all time; switch between views, paid views and earnings
- Breakdowns: top content, countries, sources (direct / links / search / social), referring sites, devices, browsers
- Per-paste analytics page
- Vault: best performing (by views, paid views or earnings), searchable / sortable / paged table with 14-day sparklines, folder filter
- Earnings: available, in progress, paid out, lifetime; cashout requests; payout method (PayPal, USDT TRC-20, Bitcoin, Litecoin); daily activity log
- Referrals: custom link `/r/yourcode`, 5% commission paid by Pastify, referred-user table
- API keys (shown once, stored hashed, revocable)
- Settings: profile, password change (signs out other devices), two-factor sign-in (TOTP), active sessions, account deletion

**Public site**
- "Moving from Paster" page (`/switch`) with a move guide and a dated side-by-side comparison, linked from the home page and footer
- Landing page, Explore (search, language, tags, newest / trending), creator profiles `/u/name`
- Earn page with the **public rate table** and payout rules, Pricing, API docs
- Terms, Privacy, Content policy, Report abuse form
- `robots.txt` and `sitemap.xml`

**Visitor Premium (Paddle)**
- `/premium`: 1 month $9.99, 3 months $6.99/mo ($20.97), 12 months $2.99/mo ($35.88). Premium members see no ads
- Earning pastes show "Remove ads with Premium", which credits the creator; creators also get a `/premium?ref=code` link
- Creators get **50%** of the plan price (before tax; Pastify pays Paddle's fee) on each sale and renewal, **70%** from their 6th sale of the UTC day
- Attribution is signed, so a buyer can't redirect the share to themselves; buyers can't earn on their own purchases
- Refunds and chargebacks take back the share in proportion; a full refund ends access
- Webhook (`/api/paddle/webhook`) checks Paddle's signature and ignores repeated events
- Buyers manage or cancel in Settings (Paddle customer portal); creators see sales, today's rate and their link under Premium sales

**Admin** (`/admin`, for accounts with the ADMIN role)
- Pending cashouts: mark paid, or reject with a reason (money goes back to the creator's balance)
- Abuse reports: remove content or dismiss
- Users: search, suspend / restore, balance adjustments
- Content: search and remove / restore any paste

**REST API** (`/api/v1`, bearer key, 120 requests/minute): `me`, `stats`, and full create / read / update / delete for pastes. Docs at `/docs/api`.

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
   - `NEXT_PUBLIC_AD_SCRIPT_URL` = your display-ad tag script (optional)
4. Deploy. The build runs database migrations automatically.
5. Create your admin: run the seed command once against the production database.

### Plesk

Step-by-step guide: [docs/DEPLOY_PLESK.md](docs/DEPLOY_PLESK.md). It uses Plesk's Node.js extension with `app.js` as the startup file.

### Self-host with Docker

Put your settings in `.env`, then:

```bash
docker compose up -d --build
```

Sign up with the address in `ADMIN_EMAIL` and that account becomes admin. Put a reverse proxy (Caddy, nginx or Cloudflare) in front for HTTPS.

Behind Cloudflare instead, use `IP_HEADER=cf-connecting-ip` and `GEO_HEADER=cf-ipcountry`.

**Important:** `GEO_HEADER` must be a header your host sets and visitors can't. If it's unset, every visitor is paid at the "rest of world" rate.

## Set up Paddle (Premium)

1. Create a Paddle account and start in **sandbox**.
2. Catalog → Products: create "Pastify Premium" with three recurring USD prices: $9.99 every month, $20.97 every 3 months, $35.88 every year. Copy each price id (`pri_…`).
3. Developer tools → Authentication: create a **client-side token** and an **API key**.
4. Developer tools → Notifications: add a destination `https://your-domain/api/paddle/webhook` with the events `transaction.completed`, `subscription.created`, `subscription.updated`, `subscription.canceled`, `adjustment.created`, `adjustment.updated`. Copy its secret key.
5. Put the values in the `PADDLE_*` environment variables (see `.env.example`) and redeploy.
6. Test with Paddle's sandbox test cards, then switch `NEXT_PUBLIC_PADDLE_ENV` to `production` with live keys.

Until these are set, `/premium` shows the plans with "Coming soon" and pastes don't show the Premium link.

## Business settings to review before launch

- **Set an ad script before turning on earnings.** Earning pastes pay creators per view whether or not an ad is shown. Set `NEXT_PUBLIC_AD_SCRIPT_URL` so the views you pay for also earn you money.

All in `src/lib/config.ts`:

- **`RATE_TIERS`**: what creators earn per 1,000 paid views for each country tier. These numbers are placeholders. Set them from your real ad/offer network revenue, keeping a margin. They're shown publicly on `/earn`.
- **`EARN`**: payout minimum ($5), cooldown (7 days), pending limit (2), payout target (5 business days), referral rate (5%), payout methods.

Also review:
- The legal pages in `src/app/(site)/legal/[page]/page.tsx` are a starting point written for this product. Have them checked by a lawyer for your country before launch.
- The **refund policy** in the Terms (14 days, written as a placeholder) and Premium wording. Paddle reviews these before approving your account.
- Payouts are **manual**: admins send the money (PayPal / wallet), then press "Mark paid".

## Not built yet (next steps)

- **Emails** (welcome, payout paid/rejected, content removed): needs an email provider such as Resend or Postmark
- Automatic payouts through the PayPal Payouts API or a crypto payout provider
- World map on the dashboard
- Custom domains for creators' links
- Identity checks (KYC) before large payouts

## Project layout

```
prisma/schema.prisma        data model
src/lib/config.ts           rates and payout rules
src/lib/views.ts            view counting, paid views, proof-of-work, earnings credit
src/lib/stats.ts            dashboard analytics queries
src/app/(site)/             public pages (home, paste view /[slug], explore, earn…)
src/app/dashboard/          creator dashboard
src/app/admin/              admin panel
src/app/api/view/           view beacon and paid views
src/app/api/v1/             public REST API
```
