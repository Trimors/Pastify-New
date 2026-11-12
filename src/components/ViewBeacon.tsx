"use client";
import { useEffect } from "react";

export function ViewBeacon({ slug }: { slug: string }) {
  useEffect(() => {
    fetch("/api/view", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, referrer: document.referrer }),
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}
