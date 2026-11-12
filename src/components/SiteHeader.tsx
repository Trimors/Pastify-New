import Link from "next/link";
import { getUser } from "@/lib/auth";
import { Logo } from "./Logo";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-ink/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Logo />
        <nav className="hidden items-center gap-1 text-sm text-muted sm:flex">
          <Link className="btn btn-ghost btn-sm" href="/explore">Explore</Link>
          <Link className="btn btn-ghost btn-sm" href="/earn">Earn</Link>
          <Link className="btn btn-ghost btn-sm" href="/pricing">Pricing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <Link className="btn btn-secondary btn-sm" href="/dashboard">Dashboard</Link>
          ) : (
            <Link className="btn btn-ghost btn-sm" href="/login">Log in</Link>
          )}
          <Link className="btn btn-primary btn-sm" href="/new">New paste</Link>
        </div>
      </div>
      <nav className="flex items-center gap-1 border-t border-line/60 px-2 py-1 text-sm sm:hidden">
        <Link className="btn btn-ghost btn-sm" href="/explore">Explore</Link>
        <Link className="btn btn-ghost btn-sm" href="/earn">Earn</Link>
        <Link className="btn btn-ghost btn-sm" href="/pricing">Pricing</Link>
      </nav>
    </header>
  );
}
