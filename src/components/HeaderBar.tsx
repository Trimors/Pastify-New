"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/earn", label: "Earn" },
  { href: "/premium", label: "Premium" },
  { href: "/pricing", label: "Pricing" },
];

function Arrow() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform duration-200 group-hover:translate-x-[3px]">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** Floating glass header: logo, centred pill navigation, account link and the main action. */
export function HeaderBar({ loggedIn }: { loggedIn: boolean }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-2 z-40 px-2 sm:top-3 sm:px-3">
      <div className="glass-header relative mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 rounded-[28px] border border-line pl-4 pr-3">
        <Logo />

        <nav aria-label="Main" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active(n.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200 ${
                active(n.href) ? "pf-fill-brand font-medium text-paper" : "pf-fill-1 text-muted hover:text-paper"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href={loggedIn ? "/dashboard" : "/login"} className="hidden px-3 py-2 text-sm text-paper transition-colors hover:text-muted sm:inline-flex">
            {loggedIn ? "Dashboard" : "Log in"}
          </Link>
          <Link href="/#new" className="btn btn-primary btn-sm group !pl-4 !pr-3">
            New paste <Arrow />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="pf-fill-1 flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-paper lg:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>

        {open && (
          <div className="fade-up absolute left-0 right-0 top-[calc(100%+8px)] rounded-[24px] border border-white/20 bg-[#140c1b]/95 p-2 lg:hidden">
            <nav aria-label="Main">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`block rounded-[16px] px-4 py-3 text-sm font-medium ${active(n.href) ? "bg-white/10 text-paper" : "text-muted hover:bg-white/10 hover:text-paper"}`}
                >
                  {n.label}
                </Link>
              ))}
              <Link href={loggedIn ? "/dashboard" : "/login"} className="block rounded-[16px] px-4 py-3 text-sm font-medium text-muted hover:bg-white/10 hover:text-paper">
                {loggedIn ? "Dashboard" : "Log in"}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
