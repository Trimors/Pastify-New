import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { INTENSITIES } from "@/lib/lockers";
import { SITE_HOST, SITE_URL } from "@/lib/config";
import { compact, pct } from "@/lib/format";
import { LockerForm } from "@/components/LockerForms";
import { CopyButton } from "@/components/CopyButton";
import { DeleteButton } from "@/components/DeleteButton";
import { SimpleForm } from "@/components/SimpleForm";
import { addTargetAction, deleteItem, deleteTargetAction, updateLockerAction } from "../../actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Locker" };

export default async function LockerEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;
  const l = await db.locker.findFirst({ where: { id, userId: user.id } });
  if (!l) notFound();
  const targets = await db.lockerTarget.findMany({ where: { lockerId: l.id }, orderBy: { createdAt: "desc" }, take: 200 });
  const url = `${SITE_URL}/l/${l.slug}`;
  async function remove() {
    "use server";
    await deleteItem("locker", id);
    redirect("/dashboard/vault?tab=lockers");
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {created && <p className="text-sm text-ok">Locker created.</p>}
      <div className="card flex flex-wrap items-center gap-4 border-magenta/40 p-5">
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{created ? "Your link is live" : l.title}</p>
          <p className="truncate font-mono text-sm text-muted">{SITE_HOST}/l/{l.slug}</p>
        </div>
        <CopyButton text={url} label="Copy link" className="btn btn-primary btn-sm" />
        <Link href={`/l/${l.slug}`} className="btn btn-secondary btn-sm">Open</Link>
        <Link href={`/dashboard/stats/${l.id}`} className="btn btn-secondary btn-sm">Analytics</Link>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Stat k="Views" v={compact(l.views)} />
        <Stat k="Unlocks" v={compact(l.unlocks)} />
        <Stat k="Unlock rate" v={pct(l.views ? l.unlocks / l.views : 0)} />
      </div>
      <section className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold">Edit locker</h1>
          <DeleteButton onDelete={remove} label="Delete locker" />
        </div>
        <LockerForm
          action={updateLockerAction.bind(null, l.id)}
          intensities={INTENSITIES}
          submitLabel="Save changes"
          initial={{ title: l.title, targetUrl: l.targetUrl, description: l.description ?? "", intensity: l.intensity, waitSeconds: l.waitSeconds }}
        />
      </section>
      <section className="card p-6">
        <p className="font-semibold">Extra destinations</p>
        <p className="mb-4 text-sm text-muted">
          One locker, many links. Each destination gets its own share link; views and earnings stay on this locker. Also available through the API.
        </p>
        <SimpleForm action={addTargetAction.bind(null, l.id)} submit="Add destination" className="flex flex-wrap items-start gap-2">
          <input name="url" type="url" required placeholder="https://another-target.com/file" className="input min-w-[240px] flex-[2] font-mono text-sm" />
          <input name="label" placeholder="Label (optional)" maxLength={80} className="input min-w-[140px] flex-1" />
        </SimpleForm>
        {targets.length > 0 && (
          <ul className="mt-5 divide-y divide-line text-sm">
            {targets.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t.label ?? t.url}</span>
                  <span className="block truncate font-mono text-xs text-muted">{SITE_HOST}/l/{l.slug}?d={t.code} → {t.url}</span>
                </span>
                <CopyButton text={`${url}?d=${t.code}`} label="Copy" className="btn btn-ghost btn-sm" />
                <DeleteButton onDelete={deleteTargetAction.bind(null, l.id, t.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="card p-4">
      <p className="label">{k}</p>
      <p className="font-mono text-2xl">{v}</p>
    </div>
  );
}
