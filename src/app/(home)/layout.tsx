import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

/** The home page sits inside one large glass frame, with the header inside it. */
export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="p-1.5 sm:p-3 lg:p-5">
        <div className="pf-frame mx-auto max-w-[1400px]">
          <SiteHeader />
          <main>{children}</main>
        </div>
      </div>
      <SiteFooter />
    </>
  );
}
