import { requireUser } from "@/lib/auth";
import { INTENSITIES } from "@/lib/lockers";
import { BulkLockerForm, LockerForm } from "@/components/LockerForms";
import { bulkCreateLockers, createLockerAction } from "../../actions";

export const metadata = { title: "New locker" };

export default async function NewLockerPage() {
  await requireUser();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lock a link</h1>
        <p className="text-sm text-muted">Visitors complete a few quick steps, then go to your link. You earn per unique unlock.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card p-6">
          <LockerForm action={createLockerAction} intensities={INTENSITIES} submitLabel="Create locker" />
        </section>
        <section className="card h-fit p-6">
          <p className="mb-1 font-semibold">Bulk create</p>
          <p className="mb-4 text-sm text-muted">Paste up to 200 lines of <span className="font-mono">title,url</span>.</p>
          <BulkLockerForm action={bulkCreateLockers} />
        </section>
      </div>
    </div>
  );
}
