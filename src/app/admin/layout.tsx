import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div>
      <header className="border-b border-line">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Logo href="/admin" />
          <span className="chip chip-earning">Admin</span>
          <nav className="ml-4 flex gap-1 text-sm">
            <Link href="/admin" className="btn btn-ghost btn-sm">Queue</Link>
            <Link href="/admin/users" className="btn btn-ghost btn-sm">Users</Link>
            <Link href="/admin/content" className="btn btn-ghost btn-sm">Content</Link>
          </nav>
          <Link href="/dashboard" className="btn btn-secondary btn-sm ml-auto">Dashboard</Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
