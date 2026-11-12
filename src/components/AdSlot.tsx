"use client";
import { useEffect, useRef } from "react";

const SRC = process.env.NEXT_PUBLIC_AD_SCRIPT_URL || "";

/**
 * Display ad slot shown during the "Quick check" step.
 * Set NEXT_PUBLIC_AD_SCRIPT_URL to your ad network's tag script to fill it.
 */
export function AdSlot({ className = "" }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!SRC || !box.current || box.current.dataset.loaded) return;
    box.current.dataset.loaded = "1";
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    box.current.appendChild(s);
  }, []);
  if (!SRC && process.env.NODE_ENV === "production") return null;
  return (
    <div ref={box} className={`flex min-h-[100px] items-center justify-center rounded-lg border border-dashed border-line text-xs text-muted ${className}`}>
      {!SRC && "Ad slot · set NEXT_PUBLIC_AD_SCRIPT_URL"}
    </div>
  );
}
