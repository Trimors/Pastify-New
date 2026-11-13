import Link from "next/link";
import { EARN, RATE_TIERS } from "@/lib/config";

export const metadata = {
  title: "Moving from Paster",
  description: "Paster is winding down. Bring your pastes to Pastify: rich text, templates, published rates and quick unlocks.",
};

const ROWS: [string, string, string][] = [
  ["Rich text editor", "Yes", "Yes"],
  ["Code with syntax highlighting", "No", "30+ languages"],
  ["Templates", "Yes", "Yes"],
  ["Clone from other pastebins", "Yes", "Yes"],
  ["Public / unlisted / private", "No", "Yes"],
  ["Password, expiry, burn after reading", "No", "Yes"],
  ["Raw view and download", "No", "Yes"],
  ["Public explore page and profiles", "No", "Yes"],
  ["Visitor wait before content", "15 seconds to 180 minutes", "A few seconds"],
  ["Published rates per country", "No", "Yes"],
  ["Documented API", "Docs offline", "Yes"],
  ["Still being developed", "No, winding down", "Yes"],
];

export default function SwitchPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <p className="label !text-rose">Moving from Paster</p>
      <h1 className="max-w-3xl text-5xl font-extrabold tracking-[-0.03em]">Your pastes need a new home. Bring them here.</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted">
        Paster has said it is being discontinued and no longer gets updates. Pastify has the same kind of editor, plus code highlighting, privacy options and earnings you can check against public rates.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/signup" className="btn btn-primary">Create free account</Link>
        <Link href="/earn" className="btn btn-secondary">See rates</Link>
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Move in three steps</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["01", "Create your account", "Free, about a minute. Turn on two-factor sign-in in Settings while you're there."],
            ["02", "Bring each paste over", "Open your paste on Paster, select all, copy, and paste into Pastify's Rich text editor. Headings, lists and links come with it. Turn Earning on."],
            ["03", "Swap your links", "Replace the old links in your video descriptions, Discord servers and bios with the new Pastify ones. Visitors follow the link you share."],
          ].map(([n, t, d]) => (
            <li key={n} className="card p-6">
              <p className="font-mono text-sm text-rose">{n}</p>
              <p className="mt-3 text-lg font-semibold">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-muted">
          Paster has no raw or export links, so pastes can&apos;t be imported automatically. For posts you make often, save them as{" "}
          <Link href="/dashboard/templates" className="text-rose hover:underline">templates</Link>. Pastes on Pastebin, Rentry, GitHub Gist, paste.ee and dpaste can be cloned directly with Clone in the editor.
        </p>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Side by side</h2>
        <p className="mt-1 text-sm text-muted">Based on Paster&apos;s site as of November 2026.</p>
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-5 py-3">Feature</th>
                <th className="px-5">Paster</th>
                <th className="px-5 text-rose">Pastify</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([f, a, b]) => (
                <tr key={f} className="border-t border-line">
                  <td className="px-5 py-3">{f}</td>
                  <td className="px-5 text-muted">{a}</td>
                  <td className="px-5 font-medium">{b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14 grid gap-4 md:grid-cols-3">
        {[
          [`$${RATE_TIERS[0].cpm.toFixed(2)}`, "Top CPM, published per country"],
          [`$${EARN.payoutMinimumUsd}`, "Minimum cashout"],
          [`${EARN.referralRate * 100}%`, "Referral commission, for life"],
        ].map(([k, v]) => (
          <div key={v} className="card p-5">
            <p className="font-mono text-3xl text-gradient">{k}</p>
            <p className="mt-1 text-sm text-muted">{v}</p>
          </div>
        ))}
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold tracking-tight">Questions</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[
            ["What happens to my Paster balance?", "It stays with Paster. Contact Paster to withdraw it. Pastify can't see or move Paster balances."],
            ["Will my old links redirect?", "No. Only Paster controls its links, so share your new Pastify links in their place."],
            ["Do visitors have to wait long?", "No. Earning pastes use a short unlock of a few seconds. We don't use long countdowns to push sales."],
            ["Is it free?", "Yes. Creators never pay. Pastify earns from sponsors shown during unlocks."],
          ].map(([q, a]) => (
            <div key={q} className="card p-5">
              <p className="font-semibold">{q}</p>
              <p className="mt-1 text-sm text-muted">{a}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
