import Link from "next/link";

/** The Short Stack: a solid top sheet, with a stem half its width leaning on the same line. */
export function Mark({ size = 28, animate = false, className = "" }: { size?: number; animate?: boolean; className?: string }) {
  const id = `pg${size}${animate ? "a" : ""}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`${animate ? "mark-animate" : ""} ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#EF3B98" />
          <stop offset="0.5" stopColor="#D13BD0" />
          <stop offset="1" stopColor="#A34DFF" />
        </linearGradient>
      </defs>
      {/* top sheet: 60 wide, solid */}
      <polygon className="mark-top" points="34,14 94,14 84,46 24,46" fill={`url(#${id})`} />
      {/* stem: 30 wide (50%), 8-unit gap, same lean line */}
      <polygon className="mark-stem" points="21.5,54 51.5,54 40.25,90 10.25,90" fill={`url(#${id})`} opacity="0.55" />
    </svg>
  );
}

export function AppIcon({ size = 32 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center bg-gradient"
      style={{ width: size, height: size, borderRadius: size * 0.23 }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 100 100" aria-hidden="true">
        <polygon points="34,14 94,14 84,46 24,46" fill="white" />
        <polygon points="21.5,54 51.5,54 40.25,90 10.25,90" fill="white" opacity="0.55" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 font-extrabold tracking-tight text-[1.15rem]">
      <AppIcon size={28} />
      <span>Pastify</span>
    </Link>
  );
}
