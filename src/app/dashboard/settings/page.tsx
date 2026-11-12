import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/ids";
import { relTime } from "@/lib/format";
import { SimpleForm } from "@/components/SimpleForm";
import { TotpSetup } from "@/components/TotpSetup";
import { changePassword, confirmTotp, deleteAccount, disableTotp, saveProfile, signOutOthers, startTotp } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const current = sha256((await cookies()).get("pf_session")?.value ?? "");
  const sessions = await db.session.findMany({ where: { userId: user.id, expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Section title="Profile" desc={`Shown on your public page at /u/${user.username}.`}>
        <SimpleForm action={saveProfile} submit="Save profile">
          <div>
            <label className="label" htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" defaultValue={user.displayName ?? ""} maxLength={40} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" defaultValue={user.bio ?? ""} maxLength={280} rows={3} className="input resize-none" />
          </div>
        </SimpleForm>
      </Section>

      <Section title="Account" desc="Email and username can't be changed yet.">
        <dl className="grid grid-cols-[120px_1fr] gap-2 text-sm">
          <dt className="text-muted">Email</dt><dd>{user.email}</dd>
          <dt className="text-muted">Username</dt><dd>@{user.username}</dd>
          <dt className="text-muted">Joined</dt><dd>{user.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</dd>
        </dl>
      </Section>

      <Section title="Password">
        <SimpleForm action={changePassword} submit="Change password">
          <input name="current" type="password" placeholder="Current password" autoComplete="current-password" className="input" required />
          <input name="next" type="password" placeholder="New password" autoComplete="new-password" minLength={8} className="input" required />
        </SimpleForm>
      </Section>

      <Section title="Two-factor sign-in" desc="Ask for a code from your authenticator app when you log in.">
        {user.totpEnabled ? (
          <div className="space-y-3">
            <p className="text-sm text-ok">On</p>
            <SimpleForm action={disableTotp} submit="Turn off" variant="danger" className="flex flex-wrap items-start gap-2">
              <input name="code" inputMode="numeric" maxLength={8} placeholder="Current code" className="input !w-40 font-mono" />
            </SimpleForm>
          </div>
        ) : (
          <TotpSetup start={startTotp} confirm={confirmTotp} />
        )}
      </Section>

      <Section title="Active sessions">
        <ul className="divide-y divide-line text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 py-2.5">
              <span className="min-w-0">
                <span className="block truncate">{s.userAgent?.slice(0, 80) ?? "Unknown device"}</span>
                <span className="font-mono text-xs text-muted">{s.ip} · {relTime(s.createdAt)}</span>
              </span>
              {s.id === current && <span className="chip chip-public">This device</span>}
            </li>
          ))}
        </ul>
        {sessions.length > 1 && (
          <form action={signOutOthers} className="mt-3">
            <button className="btn btn-secondary btn-sm">Sign out other devices</button>
          </form>
        )}
      </Section>

      <Section title="Delete account" desc="Deletes your pastes, lockers and unpaid balance. This can't be undone.">
        <SimpleForm action={deleteAccount} submit="Delete account" variant="danger">
          <input name="confirm" placeholder={`Type ${user.username}`} className="input" />
          <input name="password" type="password" placeholder="Password" className="input" />
        </SimpleForm>
      </Section>
    </div>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="card p-5">
      <p className="font-semibold">{title}</p>
      {desc && <p className="mb-4 text-sm text-muted">{desc}</p>}
      <div className={desc ? "" : "mt-4"}>{children}</div>
    </section>
  );
}
