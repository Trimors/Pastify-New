import "server-only";
import { headers } from "next/headers";
import { createHash, createHmac } from "crypto";
import { isIPv4, isIPv6 } from "net";
import { clientIp } from "./auth";

export type VisitorInfo = {
  hash: string;
  /** Keyed hash of the IP (IPv6 by /64 block), stable across days. One view per IP per paste per 24h is keyed on this. */
  ipHash: string;
  country: string;
  device: "desktop" | "mobile" | "tablet";
  browser: string;
  isBot: boolean;
  userAgent: string;
};

/**
 * The part of an IP that identifies one visitor. IPv4 as is. IPv6 by its /64 prefix,
 * because providers hand each customer a whole /64 they can rotate through freely.
 */
export function ipKey(ip: string): string {
  const v = ip.trim().toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  if (isIPv4(v)) return v;
  if (!isIPv6(v)) return v || "0.0.0.0";
  // Expand "::" so we can take the first four groups.
  let groups: string[];
  if (v.includes("::")) {
    const [head, tail] = v.split("::");
    const h = head ? head.split(":") : [];
    const t = tail ? tail.split(":") : [];
    groups = [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  } else {
    groups = v.split(":");
  }
  return groups.slice(0, 4).map((g) => g.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

export function ipHashOf(ip: string) {
  return createHmac("sha256", `${process.env.AUTH_SECRET}|ip`).update(ipKey(ip)).digest("hex").slice(0, 32);
}

const BOT_RE = /bot|crawl|spider|slurp|headless|phantom|puppeteer|playwright|selenium|python-requests|curl|wget|httpclient|axios|node-fetch|go-http|java\//i;

export async function visitor(): Promise<VisitorInfo> {
  const h = await headers();
  const ua = h.get("user-agent") || "";
  const ip = await clientIp();
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHash("sha256")
    .update(`${process.env.AUTH_SECRET}|${day}|${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);
  // Only trust the geo header your edge sets (GEO_HEADER), otherwise visitors could pick their own rate tier.
  const geoHeader = process.env.GEO_HEADER?.toLowerCase();
  const raw = geoHeader ? h.get(geoHeader) : null;
  const country = raw && /^[A-Za-z]{2}$/.test(raw) ? raw.toUpperCase() : "XX";
  return { hash, ipHash: ipHashOf(ip), country, device: device(ua), browser: browser(ua), isBot: !ua || BOT_RE.test(ua), userAgent: ua };
}

function device(ua: string): VisitorInfo["device"] {
  if (/ipad|tablet|kindle|silk|playbook/i.test(ua) || (/android/i.test(ua) && !/mobile/i.test(ua))) return "tablet";
  if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return "mobile";
  return "desktop";
}

function browser(ua: string) {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/brave/i.test(ua)) return "Brave";
  if (/firefox|fxios/i.test(ua)) return "Firefox";
  if (/samsungbrowser/i.test(ua)) return "Samsung";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

const SOCIAL = ["facebook.", "fb.", "t.co", "twitter.", "x.com", "instagram.", "tiktok.", "reddit.", "youtube.", "youtu.be", "discord.", "telegram.", "t.me", "linkedin.", "pinterest.", "snapchat.", "whatsapp."];
const SEARCH = ["google.", "bing.", "duckduckgo.", "yahoo.", "yandex.", "baidu.", "ecosia.", "brave.com/search"];

export function classifyReferrer(ref: string | null | undefined, selfHost: string) {
  if (!ref) return { source: "direct", domain: null as string | null };
  let host: string;
  try {
    host = new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return { source: "direct", domain: null };
  }
  if (!host || host === selfHost.replace(/^www\./, "").split(":")[0]) return { source: "direct", domain: null };
  if (SOCIAL.some((s) => host.includes(s))) return { source: "social", domain: host };
  if (SEARCH.some((s) => host.includes(s))) return { source: "search", domain: host };
  return { source: "links", domain: host };
}
