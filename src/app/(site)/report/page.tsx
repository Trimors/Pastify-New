import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/auth";
import { rateLimit } from "@/lib/ratelimit";

export const metadata = { title: "Report abuse" };

const REASONS = ["Malware or phishing", "Illegal content", "Copyright", "Personal information", "Spam", "Other"];

async function submit(form: FormData) {
  "use server";
  const ip = await clientIp();
  if (!(await rateLimit(`report:${ip}`, 10, 3600))) redirect("/report?sent=limit");
  const raw = String(form.get("slug") || "").trim();
  const isLocker = /\/l\//.test(raw) || form.get("kind") === "locker";
  const slug = raw.replace(/^https?:\/\/[^/]+/, "").replace(/^\/(l\/)?/, "").split(/[/?#]/)[0];
  const reason = String(form.get("reason") || "");
  if (!slug || !REASONS.includes(reason)) redirect("/report?sent=invalid");
  await db.report.create({
    data: {
      kind: isLocker ? "LOCKER" : "PASTE",
      slug: slug.slice(0, 32),
      reason,
      details: String(form.get("details") || "").slice(0, 2000) || null,
      reporterEmail: String(form.get("email") || "").slice(0, 200) || null,
    },
  });
  redirect("/report?sent=1");
}

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ slug?: string; kind?: string; sent?: string }> }) {
  const { slug, kind, sent } = await searchParams;
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Report abuse</h1>
      <p className="mt-2 text-muted">We review every report. Content that breaks the policy is removed and creators lose earnings from it.</p>
      {sent === "1" ? (
        <p className="card mt-8 p-6 text-ok">Report sent. Thank you.</p>
      ) : (
        <form action={submit} className="card mt-8 space-y-4 p-6">
          {sent === "limit" && <p className="text-sm text-bad">Too many reports. Try again later.</p>}
          {sent === "invalid" && <p className="text-sm text-bad">Add the link and pick a reason.</p>}
          <input type="hidden" name="kind" value={kind ?? ""} />
          <div>
            <label className="label" htmlFor="slug">Link or ID</label>
            <input id="slug" name="slug" defaultValue={slug} required className="input font-mono text-sm" />
          </div>
          <div>
            <label className="label" htmlFor="reason">Reason</label>
            <select id="reason" name="reason" className="input" required>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="details">Details</label>
            <textarea id="details" name="details" rows={4} maxLength={2000} className="input resize-none" />
          </div>
          <div>
            <label className="label" htmlFor="email">Your email (optional)</label>
            <input id="email" name="email" type="email" className="input" />
          </div>
          <button className="btn btn-primary w-full">Send report</button>
        </form>
      )}
    </div>
  );
}
