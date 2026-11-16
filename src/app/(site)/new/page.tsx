import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRY_OPTIONS } from "@/lib/pastes";
import { PasteEditor } from "@/components/editor/PasteEditor";
import { cloneAction, createPasteAction, loadTemplateAction } from "./actions";

export const metadata = { title: "New paste" };

export default async function NewPastePage() {
  const user = await getUser();
  const [folders, templates] = user
    ? await Promise.all([
        db.folder.findMany({ where: { userId: user.id }, orderBy: { name: "asc" }, select: { name: true } }),
        db.template.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true }, take: 50 }),
      ])
    : [[], []];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PasteEditor
        mode="create"
        action={createPasteAction}
        cloneAction={cloneAction}
        loadTemplateAction={loadTemplateAction}
        loggedIn={!!user}
        folders={folders.map((f) => f.name)}
        templates={templates}
        expiryOptions={EXPIRY_OPTIONS.map(({ id, label }) => ({ id, label }))}
      />
    </div>
  );
}
