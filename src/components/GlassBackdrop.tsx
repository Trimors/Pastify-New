"use client";
import { usePathname } from "next/navigation";

/** Pages that get the full-strength light. Everything else gets the calmer app version. */
const BOLD = ["/", "/premium"];

/**
 * Fixed layer of soft brand light behind every page. It is painted once on its own
 * compositor layer, so glass surfaces scroll over the colour without any live blur.
 */
export function GlassBackdrop() {
  const path = usePathname();
  const bold = BOLD.includes(path);
  return (
    <div aria-hidden className={`pf-backdrop ${bold ? "pf-backdrop--bold" : ""}`}>
      <span className="pf-orb left-[-12%] top-[-18%] h-[72vmin] w-[72vmin]" />
      <span className="pf-orb right-[-10%] top-[6%] h-[58vmin] w-[58vmin]" />
      <span className="pf-orb bottom-[-34%] right-[4%] h-[78vmin] w-[78vmin]" />
      <span className="pf-orb bottom-[-22%] left-[6%] h-[52vmin] w-[52vmin]" />
    </div>
  );
}
