"use client";
import { useEffect } from "react";

async function solvePow(salt: string, bits: number): Promise<string> {
  const enc = new TextEncoder();
  for (let n = 0; ; n++) {
    const buf = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${n}`)));
    let zeros = 0;
    for (const b of buf) {
      if (b === 0) {
        zeros += 8;
        continue;
      }
      zeros += Math.clz32(b) - 24;
      break;
    }
    if (zeros >= bits) return String(n);
    if (n % 2000 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

/**
 * Counts a view. For earning pastes it waits until the page has been visible for a few
 * seconds and solves a tiny background check first. Visitors never see or wait for anything.
 */
export function ViewBeacon({ slug, token, minSeconds = 5, bits = 14 }: { slug: string; token?: string; minSeconds?: number; bits?: number }) {
  useEffect(() => {
    let cancelled = false;
    const send = (extra: Record<string, string> = {}) =>
      fetch("/api/view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug, referrer: document.referrer, ...extra }),
        keepalive: true,
      }).catch(() => {});

    // Count the view right away; the paid check (earning pastes) follows after the wait.
    send();
    if (!token) return;
    (async () => {
      const nonce = solvePow(token, bits);
      // Wait for the page to have been visible for minSeconds in total.
      let visibleMs = 0;
      while (!cancelled && visibleMs < minSeconds * 1000 + 250) {
        await new Promise((r) => setTimeout(r, 250));
        if (document.visibilityState === "visible") visibleMs += 250;
      }
      if (!cancelled) send({ token, nonce: await nonce });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, token, minSeconds, bits]);
  return null;
}
