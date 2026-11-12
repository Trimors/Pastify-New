import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { relTime } from "@/lib/format";
import { NewKeyForm } from "@/components/NewKeyForm";
import { DeleteButton } from "@/components/DeleteButton";
import { newKey, revokeKey } from "./actions";

export const metadata = { title: "API" };

export default async function ApiPage() {
  const user = await requireUser();
  const keys = await db.apiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API</h1>
        <p className="text-sm text-muted">
          Create pastes and lockers from your own tools. <Link href="/docs/api" className="text-rose hover:underline">Read the API docs</Link>
        </p>
      </div>
      <section className="card p-5">
        <p className="mb-3 font-semibold">New key</p>
        <NewKeyForm action={newKey} />
      </section>
      <section className="card overflow-hidden">
        <p className="border-b border-line p-4 font-semibold">Your keys</p>
        <table className="w-full text-left text-sm">
          <tbody>
            {keys.map((k) => (
              <tr key={k.id} className="border-t border-line first:border-t-0">
                <td className="px-4 py-3 font-medium">{k.name}</td>
                <td className="px-4 font-mono text-xs text-muted">{k.prefix}…</td>
                <td className="px-4 text-xs text-muted">Created {relTime(k.createdAt)}</td>
                <td className="px-4 text-xs text-muted">{k.lastUsedAt ? `Used ${relTime(k.lastUsedAt)}` : "Never used"}</td>
                <td className="px-4 text-right"><DeleteButton onDelete={revokeKey.bind(null, k.id)} label="Revoke" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!keys.length && <p className="p-8 text-center text-sm text-muted">No keys yet.</p>}
      </section>
    </div>
  );
}
