import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EXPIRY_OPTIONS } from "@/lib/pastes";
import { PasteEditor } from "@/components/editor/PasteEditor";
import { updatePasteAction } from "@/app/(site)/new/actions";

export const metadata = { title: "Edit paste" };

export default async function EditPastePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const p = await db.paste.findFirst({ where: { id, userId: user.id }, include: { folder: true } });
  if (!p) notFound();
  const folders = await db.folder.findMany({ where: { userId: user.id }, select: { name: true } });
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Edit paste</h1>
        <Link href={`/${p.slug}`} className="font-mono text-sm text-rose hover:underline">/{p.slug}</Link>
      </div>
      {p.status === "REMOVED" && <p className="mb-4 rounded-lg border border-bad/30 bg-bad/10 p-3 text-sm text-bad">This paste was removed by moderation and is not visible to others.</p>}
      <PasteEditor
        mode="edit"
        action={updatePasteAction.bind(null, p.id)}
        loggedIn
        folders={folders.map((f) => f.name)}
        expiryOptions={EXPIRY_OPTIONS.map(({ id, label }) => ({ id, label }))}
        initial={{
          title: p.title,
          filename: p.filename ?? "",
          language: p.language,
          content: p.content,
          description: p.description ?? "",
          tags: p.tags.join(", "),
          visibility: p.visibility,
          earning: p.earning,
          burnAfterRead: p.burnAfterRead,
          folder: p.folder?.name ?? "",
          hasPassword: !!p.passwordHash,
        }}
      />
    </div>
  );
}
