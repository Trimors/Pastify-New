# Deploying Pastify on Plesk (Linux)

This uses Plesk's **Node.js** extension (Phusion Passenger), **Git** extension and a **PostgreSQL** database. Plesk for Windows is not covered.

## Before you start

You need:

- Plesk Obsidian on Linux with these components (Tools & Settings → Updates → Add/Remove Components):
  - **Node.js support**, with Node.js **20 or 22**
  - **Git**
  - **PostgreSQL server**
- About **2 GB of free RAM** while building. The build (`next build`) is the heaviest step; the running site needs much less.
- A domain or subdomain in Plesk for the site, e.g. `pastify.example.com`.

## 1. Create the database

1. Websites & Domains → your domain → **Databases** → **Add Database**.
2. Type: **PostgreSQL**. Name it `pastify`, create a user and a strong password.
3. Your connection string is:

   ```
   postgresql://USER:PASSWORD@localhost:5432/pastify?schema=public
   ```

   If the password has symbols like `@`, `#` or `/`, URL-encode them (e.g. `@` → `%40`).

## 2. Get the code onto the server

1. Your domain → **Git** → **Add Repository**.
2. Remote repository: `https://github.com/Trimors/Pastify-New.git`
3. Branch: `claude/relaxed-knuth-6a1s0d` (or `main` once merged).
4. Deployment mode: **Automatic**. Server path: `/httpdocs`.
5. Click **Pull Updates** if the files don't appear in `/httpdocs` right away.

## 3. Set up the Node.js app

Your domain → **Node.js**:

| Setting | Value |
|---|---|
| Node.js version | 22 (or 20) |
| Package manager | npm |
| Document root | `/httpdocs/public` |
| Application mode | production |
| Application root | `/httpdocs` |
| Application startup file | `app.js` |

Then click **Enable Node.js**.

### Environment variables

Still on the Node.js page, open **Custom environment variables** and add these. Use a long random string for each secret (on any Mac or Linux terminal: `openssl rand -hex 32`).

| Name | Value |
|---|---|
| `DATABASE_URL` | the connection string from step 1 |
| `AUTH_SECRET` | random secret |
| `CRON_SECRET` | another random secret |
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain` (no trailing slash) |
| `NEXT_PUBLIC_SITE_NAME` | `Pastify` |
| `ADMIN_EMAIL` | your email; that account becomes admin when it signs up |
| `IP_HEADER` | `x-real-ip` (or `cf-connecting-ip` if the domain is proxied by Cloudflare) |
| `GEO_HEADER` | `cf-ipcountry` if proxied by Cloudflare; otherwise leave empty |
| `SPONSOR_URL` | your ad/offer smartlink(s), comma-separated |
| `NEXT_PUBLIC_AD_SCRIPT_URL` | your display-ad script URL (optional) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional bot check |
| `NEXT_PUBLIC_PADDLE_ENV`, `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRICE_MONTHLY`, `PADDLE_PRICE_QUARTERLY`, `PADDLE_PRICE_YEARLY` | when Premium is ready (see README) |

> **Country rates need a country header.** Plesk doesn't add one. The simplest way is to turn on Cloudflare's proxy (orange cloud) for the domain and set `GEO_HEADER=cf-ipcountry` and `IP_HEADER=cf-connecting-ip`. Without it, every visitor is paid at the "Rest of world" rate.

> Variables starting with `NEXT_PUBLIC_` are built into the site. After changing one, run the build again (step 4).

## 4. Install, build, start

On the Node.js page:

1. **NPM install**. Wait for it to finish.
2. **Run script** → type `build` → run. This creates the database tables and builds the site. It takes a few minutes.
3. **Restart App**.

Open your domain. You should see the Pastify home page.

If you have SSH access, you can do step 4 in a terminal instead, which shows clearer errors:

```bash
cd ~/httpdocs
```

```bash
npm ci
```

```bash
npm run build
```

Then click **Restart App** in Plesk. (In SSH the Plesk environment variables aren't loaded; put the same values in a `.env` file in `/httpdocs` first. `.env` is never committed to Git.)

## 5. HTTPS

Your domain → **SSL/TLS Certificates** → **Let's Encrypt** → issue a certificate, and turn on **Redirect from HTTP to HTTPS**. Sign-in cookies are marked secure, so log-ins only work over HTTPS.

## 6. Create your admin account

Go to `https://your-domain/signup` and sign up with the email you put in `ADMIN_EMAIL`. That account gets the Admin panel (`/admin`).

**Check the IP header is right:** log in, open Dashboard → Settings → Active sessions. It should show your real IP. If it shows `127.0.0.1`, change `IP_HEADER` (try `x-forwarded-for`), then restart the app.

## 7. Daily cleanup job

Tools & Settings (or your domain) → **Scheduled Tasks** → **Add Task** → **Run a command**, daily:

```
curl -fsS -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain/api/cron/cleanup
```

It deletes expired pastes (7 days after expiry), old unlock sessions and stale sign-in sessions.

## Updating the site

1. Your domain → **Git** → **Pull Updates** (automatic mode does this on every push if you add the webhook Plesk shows you to GitHub).
2. Node.js → **NPM install** → **Run script** `build` → **Restart App**.

## Troubleshooting

- **The build stops or the server becomes slow:** not enough RAM. Add swap on the server, or build on your computer with the same `.env` and upload the `.next` folder.
- **"Can't reach database server":** check `DATABASE_URL`, and that PostgreSQL runs on the same server (`localhost`).
- **Blank page or 502 after restart:** open the Node.js page → **Logs**, or `~/logs/` on the server; the startup error is there.
- **Changed a `NEXT_PUBLIC_` variable but nothing changed:** run the `build` script again, then restart.
