"use client";
import { useEffect, useRef, useState } from "react";
import { Mark } from "@/components/Logo";

/* Every figure in these cards is sample data and labelled "Example". */

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** visible: on screen now. seen: has been on screen at least once. */
function useInView<T extends HTMLElement>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      setSeen(true);
      return;
    }
    const obs = new IntersectionObserver(([e]) => {
      setVisible(e.isIntersecting);
      if (e.isIntersecting) {
        setSeen(true);
        el.setAttribute("data-visible", "");
      } else el.removeAttribute("data-visible");
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible, seen };
}

function useCountUp(target: number, start: boolean, ms = 1200) {
  const reduced = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    if (reduced) return setV(target);
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, start, ms, reduced]);
  return v;
}

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** Views → paid views. Counts up, then keeps ticking while on screen. */
export function StatsCard() {
  const VIEWS = 1240;
  const PAID = 912;
  const { ref, visible, seen } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const views = useCountUp(VIEWS, seen);
  const paid = useCountUp(PAID, seen);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!visible || reduced) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 2800);
    return () => window.clearInterval(id);
  }, [visible, reduced]);

  const shownViews = tick === 0 ? views : VIEWS + tick * 4;
  const shownPaid = tick === 0 ? paid : PAID + tick * 3;

  return (
    <div ref={ref} data-anim className="spot tilt pf-tile flex h-full flex-col gap-2.5 p-2.5">
      <div className="pf-widget flex flex-1 flex-col justify-center p-6">
        <p className="text-sm text-muted">Views</p>
        <p className="relative mt-0.5 font-mono text-3xl font-medium tabular-nums">
          <span key={tick} className={`inline-block ${tick ? "pfa-tick" : ""}`}>{fmt(shownViews)}</span>
          {tick > 0 && <span key={`p${tick}`} aria-hidden className="pfa-plus absolute top-1 ml-2 text-xs font-semibold text-rose">+4</span>}
        </p>

        <div aria-hidden className="relative my-1 flex h-14 items-center justify-center">
          <span className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
          <span className="pfa-flow absolute left-1/2 top-0 -ml-[3px] h-1.5 w-1.5 rounded-full bg-rose" />
          <span className="pf-fill-1 relative flex h-10 w-10 items-center justify-center rounded-full bg-[#0b0710]">
            <span className="pfa-spin pf-conic-ring absolute -inset-1 rounded-full" />
            {tick > 0 && <span key={tick} className="pfa-ping absolute inset-0 rounded-full border border-rose" />}
            <span className="inline-flex transition-transform duration-700" style={{ transform: `rotate(${tick * 90}deg)` }}>
              <Mark size={22} />
            </span>
          </span>
        </div>

        <p className="text-sm text-muted">Paid views</p>
        <p className="relative mt-0.5 font-mono text-3xl font-medium tabular-nums">
          <span key={tick} className={`inline-block ${tick ? "pfa-tick" : ""}`}>{fmt(shownPaid)}</span>
          {tick > 0 && <span key={`p${tick}`} aria-hidden className="pfa-plus absolute top-1 ml-2 text-xs font-semibold text-rose">+3</span>}
        </p>
      </div>

      <div className="pf-widget px-5 py-3 text-center">
        <p className="text-xs text-muted">Example paid view rate</p>
        <p className="mt-0.5 font-mono text-sm font-semibold">74%</p>
        <div aria-hidden className="relative mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          {seen && (
            <span className="pfa-fill-x absolute inset-y-0 left-0 w-[74%] overflow-hidden rounded-full bg-bar">
              <span className="pfa-shimmer absolute inset-y-0 left-0 w-1/3 bg-white/50" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/** Small eye badge in the brand card: a view lands and pays out. */
export function ViewBadge() {
  return (
    <span aria-hidden className="absolute right-5 top-5 h-12 w-12 sm:right-7 sm:top-7">
      <span className="pfa-badge-ping absolute inset-0 rounded-full border border-white/70" />
      <span className="pfa-coin absolute -top-5 left-1/2 -ml-8 w-16 text-center font-mono text-[11px] font-semibold text-white">+$0.006</span>
      <span className="absolute inset-0 flex items-center justify-center rounded-full border border-white/25 bg-white/10 shadow-lg">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="currentColor" fillOpacity="0.12" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </span>
    </span>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const VALUES = [3.1, 4.6, 3.8, 5.9, 4.2, 6.4, 5.7];
const W = 280;
const H = 110;
const PAD = 8;
const point = (i: number) => ({
  x: PAD + (i * (W - PAD * 2)) / (VALUES.length - 1),
  y: H - PAD - ((VALUES[i] - 2) / 5) * (H - PAD * 2),
});

function smoothPath() {
  const pts = VALUES.map((_, i) => point(i));
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += ` C ${(p1.x + (p2.x - p0.x) / 6).toFixed(1)} ${(p1.y + (p2.y - p0.y) / 6).toFixed(1)}, ${(p2.x - (p3.x - p1.x) / 6).toFixed(1)} ${(p2.y - (p3.y - p1.y) / 6).toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Earnings chart. Walks through the days by itself; hovering takes over. */
export function EarningsCard() {
  const total = VALUES.reduce((a, b) => a + b, 0);
  const { ref, visible, seen } = useInView<HTMLDivElement>();
  const reduced = useReducedMotion();
  const shown = useCountUp(total, seen);
  const [hover, setHover] = useState<number | null>(null);
  const [auto, setAuto] = useState(5);

  useEffect(() => {
    if (!visible || reduced || hover !== null) return;
    const id = window.setInterval(() => setAuto((d) => (d + 1) % VALUES.length), 1700);
    return () => window.clearInterval(id);
  }, [visible, reduced, hover]);

  const day = hover ?? (reduced ? 5 : auto);
  const line = smoothPath();
  const p = point(day);
  const slide = "transform 520ms var(--ease-out)";

  return (
    <div ref={ref} data-anim className="spot tilt pf-tile h-full p-2.5">
      <div className="pf-widget flex h-full flex-col p-5 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted">Earnings</p>
          <span className="glass-pill !px-2.5 !py-1">Example</span>
        </div>
        <p className="mt-3 font-mono text-3xl font-medium tabular-nums">${shown.toFixed(2)}</p>
        <p className="mt-0.5 text-xs text-muted">Last 7 days</p>

        <div className="relative mt-auto pt-8">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block h-auto w-full overflow-visible"
            role="img"
            aria-label="Example chart of earnings over seven days"
            onPointerLeave={() => setHover(null)}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const k = (e.clientX - r.left) / r.width;
              setHover(Math.max(0, Math.min(VALUES.length - 1, Math.round(k * (VALUES.length - 1)))));
            }}
          >
            <defs>
              <linearGradient id="pf-hero-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F07CC4" stopOpacity="0.32" />
                <stop offset="100%" stopColor="#F07CC4" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="pf-hero-line" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#EF3B98" />
                <stop offset="0.5" stopColor="#D13BD0" />
                <stop offset="1" stopColor="#A34DFF" />
              </linearGradient>
            </defs>
            {seen &&
              VALUES.map((_, i) => {
                const b = point(i);
                return (
                  <rect
                    key={i}
                    x={b.x - 9}
                    y={b.y}
                    width={18}
                    height={H - b.y}
                    rx={5}
                    className="pfa-bar transition-[fill] duration-500"
                    fill={i === day ? "rgb(240 124 196 / 0.25)" : "rgb(255 255 255 / 0.05)"}
                    style={{ animationDelay: `${i * 70}ms` }}
                  />
                );
              })}
            <path d={`${line} L ${W - PAD} ${H} L ${PAD} ${H} Z`} fill="url(#pf-hero-area)" style={{ opacity: seen ? 1 : 0, transition: "opacity 900ms ease-out 500ms" }} />
            <path d={line} fill="none" pathLength={1} data-shown={seen} className="pf-chart-draw" stroke="url(#pf-hero-line)" strokeWidth={2} strokeLinecap="round" />
            <g style={{ transform: `translateX(${p.x}px)`, transition: slide }}>
              <line x1={0} x2={0} y1={0} y2={H} stroke="rgb(255 255 255 / 0.25)" strokeWidth={1} strokeDasharray="3 3" />
              <g style={{ transform: `translateY(${p.y}px)`, transition: slide }}>
                <circle r={4} fill="#F07CC4" stroke="#0b0710" strokeWidth={2} />
              </g>
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ transform: `translateX(${(p.x / W) * 100}%)`, transition: slide }}>
            <span className="inline-block -translate-x-1/2 whitespace-nowrap rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] font-semibold text-[#0b0710]">
              {DAYS[day]} ${VALUES[day].toFixed(2)}
            </span>
          </div>
          <div className="mt-2 flex justify-between px-0.5" aria-hidden>
            {DAYS.map((d, i) => (
              <span key={d} className={`w-3 text-center text-[11px] transition-colors duration-300 ${i === day ? "font-semibold text-rose" : "text-muted"}`}>
                {d[0]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
