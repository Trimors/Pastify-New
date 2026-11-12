import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { DashNav } from "@/components/DashNav";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="lg:flex">
      <aside className="border-b border-line bg-ink lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-4 lg:block lg:p-5">
          <Logo href="/dashboard" />
          <Link href="/new" className="btn btn-primary btn-sm lg:mt-5 lg:w-full">New paste</Link>
        </div>
        <div className="px-3 pb-3 lg:flex-1">
          <DashNav isAdmin={user.role === "ADMIN"} />
        </div>
        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm font-semibold">@{user.username}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
          <div className="mt-3 flex gap-2">
            <Link href={`/u/${user.username}`} className="btn btn-ghost btn-sm !px-2">Profile</Link>
            <form action="/logout" method="post">
              <button className="btn btn-ghost btn-sm !px-2">Log out</button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-8 lg:px-10">{children}</main>
    </div>
  );
}
