import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRY_OPTIONS } from "@/lib/pastes";
import { PasteEditor } from "@/components/editor/PasteEditor";
import { createPasteAction } from "./actions";

export const metadata = { title: "New paste" };

export default async function NewPastePage() {
  const user = await getUser();
  const folders = user ? await db.folder.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } }) : [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">New paste</h1>
      <PasteEditor
        mode="create"
        action={createPasteAction}
        loggedIn={!!user}
        folders={folders.map((f) => f.name)}
        expiryOptions={EXPIRY_OPTIONS.map(({ id, label }) => ({ id, label }))}
      />
    </div>
  );
}
