import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/70">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm text-muted">Paste. Share. Earn.</p>
          <div className="pt-3">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted/80">Engineered by</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
            src="/brand/trimors-technologies-light.webp"
            alt="Trimors Technologies"
            width={2000}
            height={614}
            loading="lazy"
            className="h-11 w-auto opacity-85 sm:h-12"
            />
          </div>
        </div>
        <FooterCol title="Product" links={[["New paste", "/new"], ["Explore", "/explore"], ["Pricing", "/pricing"], ["API", "/docs/api"], ["Moving from Paster", "/switch"]]} />
        <FooterCol title="Creators" links={[["Earn", "/earn"], ["Rates", "/earn#rates"], ["Dashboard", "/dashboard"], ["Referrals", "/dashboard/referrals"]]} />
        <FooterCol title="Legal" links={[["Terms", "/legal/terms"], ["Privacy", "/legal/privacy"], ["Content policy", "/legal/content"], ["Report abuse", "/report"]]} />
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="label">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(([l, h]) => (
          <li key={h}>
            <Link href={h} className="text-muted hover:text-paper">{l}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
