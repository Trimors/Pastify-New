import Link from "next/link";
import { SITE_URL } from "@/lib/config";

export const metadata = { title: "API docs" };

const B = SITE_URL;

const endpoints: { m: string; p: string; d: string; body?: string; res?: string }[] = [
  { m: "GET", p: "/api/v1/me", d: "Your username and current balance.", res: `{ "data": { "username": "you", "balanceUsd": 12.34 } }` },
  { m: "GET", p: "/api/v1/stats?period=28d", d: "Views, unlocks and earnings. period: today, 7d, 28d, 90d, all." },
  { m: "GET", p: "/api/v1/pastes?page=1&limit=25", d: "List your pastes, newest first." },
  {
    m: "POST",
    p: "/api/v1/pastes",
    d: "Create a paste. Only content is required.",
    body: `{
  "content": "print('hi')",
  "format": "code",              // code | rich (rich = HTML, sanitized)
  "title": "hello.py",
  "filename": "hello.py",
  "language": "python",          // or omit to detect from filename
  "visibility": "UNLISTED",      // PUBLIC | UNLISTED | PRIVATE
  "earning": true,
  "expiry": "7d",                // never | 10m | 1h | 1d | 7d | 30d | 1y
  "password": "optional",
  "burnAfterRead": false,
  "tags": ["python", "demo"],
  "editCode": "optional, 6+ chars"
}`,
    res: `{ "data": { "slug": "x8Kq2a", "url": "${B}/x8Kq2a", ... } }`,
  },
  { m: "GET", p: "/api/v1/pastes/{slug}", d: "One paste, including its content." },
  { m: "PATCH", p: "/api/v1/pastes/{slug}", d: "Update any field from create. Send only what changes." },
  { m: "DELETE", p: "/api/v1/pastes/{slug}", d: "Delete a paste." },
  { m: "GET", p: "/api/v1/lockers", d: "List your lockers." },
  {
    m: "POST",
    p: "/api/v1/lockers",
    d: "Lock a link.",
    body: `{
  "title": "Script pack v3",
  "target": "https://example.com/download",
  "intensity": "standard",       // light | standard | heavy
  "waitSeconds": 0               // 0-120
}`,
    res: `{ "data": { "slug": "Ab3k9P", "url": "${B}/l/Ab3k9P", ... } }`,
  },
  { m: "GET", p: "/api/v1/lockers/{slug}", d: "One locker." },
  { m: "PATCH", p: "/api/v1/lockers/{slug}", d: "Change title, target, description, intensity or waitSeconds." },
  { m: "DELETE", p: "/api/v1/lockers/{slug}", d: "Delete a locker." },
  {
    m: "POST",
    p: "/api/v1/lockers/{slug}/targets",
    d: "One locker, many destinations. Adds a destination and returns its own share link. Views and earnings stay on the locker.",
    body: `{ "target": "https://example.com/file-42", "label": "File 42" }`,
    res: `{ "data": { "code": "Hk3mQx7a", "url": "${B}/l/Ab3k9P?d=Hk3mQx7a", ... } }`,
  },
  { m: "GET", p: "/api/v1/lockers/{slug}/targets", d: "List a locker's destinations." },
  { m: "DELETE", p: "/api/v1/lockers/{slug}/targets/{code}", d: "Remove a destination." },
];

export default function ApiDocs() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-4xl font-extrabold tracking-tight">API</h1>
      <p className="mt-3 text-muted">
        JSON over HTTPS. Create a key in <Link href="/dashboard/api" className="text-rose hover:underline">Dashboard → API</Link> and send it as a bearer token. Limit: 120 requests per minute per account.
      </p>
      <pre className="card mt-6 overflow-x-auto p-4 font-mono text-[13px] leading-6">{`curl ${B}/api/v1/pastes \\
  -H "Authorization: Bearer pf_your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"content":"hello world","title":"hello.txt","earning":true}'`}</pre>
      <p className="mt-4 text-sm text-muted">Errors look like <span className="font-mono text-paper">{`{ "error": { "code": "invalid_request", "message": "…" } }`}</span> with a 4xx status.</p>
      <div className="mt-10 space-y-4">
        {endpoints.map((e) => (
          <section key={e.m + e.p} className="card p-5">
            <p className="font-mono text-sm">
              <span className={`mr-3 rounded px-2 py-0.5 text-xs font-semibold ${e.m === "GET" ? "bg-ok/15 text-ok" : e.m === "DELETE" ? "bg-bad/15 text-bad" : "bg-magenta/15 text-rose"}`}>{e.m}</span>
              {e.p}
            </p>
            <p className="mt-2 text-sm text-muted">{e.d}</p>
            {e.body && <pre className="mt-3 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs leading-5">{e.body}</pre>}
            {e.res && <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 font-mono text-xs leading-5 text-muted">{e.res}</pre>}
          </section>
        ))}
      </div>
    </div>
  );
}
