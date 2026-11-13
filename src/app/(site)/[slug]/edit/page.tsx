import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { clientIp, getUser, verifyPassword } from "@/lib/auth";
import { hasGrant, setGrant } from "@/lib/grant";
import { rateLimit } from "@/lib/ratelimit";
import { EXPIRY_OPTIONS } from "@/lib/pastes";
import { PasteEditor } from "@/components/editor/PasteEditor";
import { updatePasteAction } from "../../new/actions";

export const metadata = { title: "Edit paste", robots: { index: false } };

async function enterCode(slug: string, form: FormData) {
  "use server";
  const ip = await clientIp();
  if (!(await rateLimit(`editcode:${ip}:${slug}`, 10, 600))) redirect(`/${slug}/edit?e=limit`);
  const p = await db.paste.findUnique({ where: { slug }, select: { id: true, editCodeHash: true } });
  const code = String(form.get("code") || "");
  if (!p?.editCodeHash || !code || !(await verifyPassword(code, p.editCodeHash))) redirect(`/${slug}/edit?e=wrong`);
  await setGrant("ec", p.id, 1);
  redirect(`/${slug}/edit`);
}

export default async function EditWithCodePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ e?: string }> }) {
  const { slug } = await params;
  const { e } = await searchParams;
  const p = await db.paste.findUnique({ where: { slug } });
  if (!p || p.status !== "ACTIVE") notFound();
  const user = await getUser();
  if (user && user.id === p.userId) redirect(`/dashboard/pastes/${p.id}`);
  if (!p.editCodeHash) notFound();

  if (!(await hasGrant("ec", p.id))) {
    return (
      <div className="mx-auto max-w-sm px-4 py-20">
        <form action={enterCode.bind(null, slug)} className="card space-y-4 p-6">
          <div>
            <h1 className="text-xl font-bold">Edit “{p.title}”</h1>
            <p className="mt-1 text-sm text-muted">Enter the edit code you got when this paste was created.</p>
          </div>
          <input name="code" required autoFocus autoComplete="off" className="input font-mono" placeholder="Edit code" />
          {e === "wrong" && <p className="text-sm text-bad">That code is wrong.</p>}
          {e === "limit" && <p className="text-sm text-bad">Too many tries. Wait 10 minutes.</p>}
          <button className="btn btn-primary w-full">Continue</button>
          <Link href={`/${slug}`} className="block text-center text-sm text-muted hover:text-paper">Back to paste</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="mb-4 text-sm text-muted">
        Editing <Link href={`/${slug}`} className="font-mono text-rose hover:underline">/{slug}</Link> with its edit code.
      </p>
      <PasteEditor
        mode="edit"
        viaEditCode
        action={updatePasteAction.bind(null, p.id)}
        loggedIn={!!p.userId}
        expiryOptions={EXPIRY_OPTIONS.map(({ id, label }) => ({ id, label }))}
        initial={{
          title: p.title,
          filename: p.filename ?? "",
          language: p.language,
          content: p.content,
          format: p.format === "rich" ? "rich" : "code",
          visibility: p.visibility,
          earning: p.earning,
          burnAfterRead: p.burnAfterRead,
          hasPassword: !!p.passwordHash,
        }}
      />
    </div>
  );
}
