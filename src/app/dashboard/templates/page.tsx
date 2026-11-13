import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relTime } from "@/lib/format";
import { richToText } from "@/lib/rich";
import { TemplateForm } from "@/components/editor/TemplateForm";
import { DeleteButton } from "@/components/DeleteButton";
import { deleteTemplate, saveTemplate } from "./actions";

export const metadata = { title: "Templates" };

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<{ edit?: string; new?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const templates = await db.template.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
  const editing = sp.edit ? templates.find((t) => t.id === sp.edit) : null;
  const showForm = !!editing || sp.new !== undefined;
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates</h1>
          <p className="text-sm text-muted">Reusable paste bodies. Insert one from the editor with Insert template.</p>
        </div>
        {!showForm && <Link href="/dashboard/templates?new" className="btn btn-primary btn-sm">New template</Link>}
      </div>

      {showForm && (
        <section className="card p-5">
          <p className="mb-4 font-semibold">{editing ? "Edit template" : "New template"}</p>
          <TemplateForm
            action={saveTemplate.bind(null, editing?.id ?? null)}
            initial={editing ? { title: editing.title, format: editing.format === "code" ? "code" : "rich", content: editing.content } : undefined}
          />
          <Link href="/dashboard/templates" className="btn btn-ghost btn-sm mt-3">Cancel</Link>
        </section>
      )}

      <section className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2.5">Title</th><th className="px-4">Content</th><th className="px-4">Updated</th><th className="px-4" /></tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t border-line">
                <td className="px-4 py-3 font-medium">{t.title}<span className="chip ml-2">{t.format === "code" ? "Code" : "Rich"}</span></td>
                <td className="max-w-[320px] truncate px-4 text-muted">{(t.format === "rich" ? richToText(t.content) : t.content).slice(0, 120)}</td>
                <td className="px-4 text-xs text-muted">{relTime(t.updatedAt)}</td>
                <td className="px-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/dashboard/templates?edit=${t.id}`} className="btn btn-ghost btn-sm">Edit</Link>
                    <DeleteButton onDelete={deleteTemplate.bind(null, t.id)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!templates.length && <p className="p-8 text-center text-sm text-muted">No templates yet. Make one for posts you write often, like a link list or a changelog.</p>}
      </section>
    </div>
  );
}
