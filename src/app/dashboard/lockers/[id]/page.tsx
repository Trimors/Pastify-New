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
import { deleteItem, updateLockerAction } from "../../actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Locker" };

export default async function LockerEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;
  const l = await db.locker.findFirst({ where: { id, userId: user.id } });
  if (!l) notFound();
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
