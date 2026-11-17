"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const MAX_TILT = 4; // degrees

/**
 * Cursor light on .spot surfaces and a gentle tilt on .tilt surfaces. Renders nothing.
 * One delegated listener moves a single glare layer with a transform, so following the
 * cursor never repaints the card. Off on touch screens and for reduced motion.
 */
export function GlassEffects() {
  const path = usePathname();

  // Off-screen pause: [data-anim] sections get [data-visible] only while on screen,
  // and CSS pauses their looping .pfa-* animations the rest of the time.
  useEffect(() => {
    const targets = document.querySelectorAll<HTMLElement>("[data-anim]");
    if (typeof IntersectionObserver === "undefined") {
      targets.forEach((el) => el.setAttribute("data-visible", ""));
      return;
    }
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => (e.isIntersecting ? e.target.setAttribute("data-visible", "") : e.target.removeAttribute("data-visible"))),
      { rootMargin: "80px" },
    );
    targets.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [path]);

  useEffect(() => {
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!canHover || reduced) return;

    const host = document.createElement("span");
    host.className = "pf-glare";
    host.setAttribute("aria-hidden", "true");
    const glare = document.createElement("span");
    host.appendChild(glare);

    let current: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let last: PointerEvent | null = null;
    let raf = 0;

    const release = () => {
      if (!current) return;
      current.style.removeProperty("transform");
      host.remove();
      current = null;
      rect = null;
    };

    const apply = () => {
      raf = 0;
      if (!last) return;
      const hit = (last.target as Element | null)?.closest?.<HTMLElement>(".spot, .tilt") ?? null;
      if (hit !== current) {
        release();
        if (!hit) return;
        current = hit;
        rect = hit.getBoundingClientRect();
        if (hit.classList.contains("spot")) hit.appendChild(host);
      }
      if (!current || !rect) return;
      const x = last.clientX - rect.left;
      const y = last.clientY - rect.top;
      glare.style.transform = `translate(${x}px, ${y}px)`;
      if (current.classList.contains("tilt")) {
        const rx = ((y / rect.height) - 0.5) * -2 * MAX_TILT;
        const ry = ((x / rect.width) - 0.5) * 2 * MAX_TILT;
        current.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      }
    };

    const onMove = (e: PointerEvent) => {
      last = e;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => release();
    const onScroll = () => {
      if (current) rect = current.getBoundingClientRect();
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
      release();
    };
  }, []);
  return null;
}
