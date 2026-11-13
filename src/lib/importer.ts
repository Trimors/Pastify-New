import "server-only";
import { db } from "./db";
import { SITE_HOST } from "./config";
import { isExpired, MAX_PASTE_BYTES } from "./pastes";
import { detectLanguage } from "./languages";

export type Imported = { title: string; content: string; format: "code" | "rich"; language?: string; filename?: string; source: string };

/**
 * Raw-text endpoints of public pastebins we can clone from. Only these exact hosts are ever fetched,
 * so the server can't be pointed at internal addresses.
 */
const SOURCES: { hosts: string[]; raw: (u: URL) => string | null; name: string }[] = [
  {
    name: "Pastebin",
    hosts: ["pastebin.com"],
    raw: (u) => {
      const id = u.pathname.replace(/^\/(raw\/)?/, "").split("/")[0];
      return /^[A-Za-z0-9]{4,16}$/.test(id) ? `https://pastebin.com/raw/${id}` : null;
    },
  },
  {
    name: "Rentry",
    hosts: ["rentry.co", "rentry.org"],
    raw: (u) => {
      const id = u.pathname.split("/")[1];
      return /^[A-Za-z0-9_-]{2,64}$/.test(id ?? "") ? `https://${u.hostname}/${id}/raw` : null;
    },
  },
  {
    name: "GitHub Gist",
    hosts: ["gist.github.com"],
    raw: (u) => {
      const [, user, id] = u.pathname.split("/");
      return user && /^[a-f0-9]{8,40}$/.test(id ?? "") ? `https://gist.githubusercontent.com/${user}/${id}/raw` : null;
    },
  },
  {
    name: "paste.ee",
    hosts: ["paste.ee"],
    raw: (u) => {
      const id = u.pathname.replace(/^\/(p|r)\//, "").split("/")[0];
      return /^[A-Za-z0-9]{3,16}$/.test(id) ? `https://paste.ee/r/${id}` : null;
    },
  },
  {
    name: "dpaste",
    hosts: ["dpaste.org", "dpaste.com"],
    raw: (u) => {
      const id = u.pathname.split("/")[1];
      return /^[A-Za-z0-9]{3,16}$/.test(id ?? "") ? `https://${u.hostname}/${id}${u.hostname === "dpaste.com" ? ".txt" : "/raw"}` : null;
    },
  },
];

const RAW_REDIRECT_HOSTS = new Set(["gist.githubusercontent.com", "pastebin.com", "rentry.co", "rentry.org", "paste.ee", "dpaste.org", "dpaste.com"]);

export const SUPPORTED_SOURCES = ["Pastify", ...SOURCES.map((s) => s.name)];

export async function importPaste(input: string, viewerId: string | null): Promise<Imported> {
  const raw = input.trim();
  if (!raw) throw new Error("Paste a link or ID.");

  // Bare ID or a Pastify link → read straight from our database.
  let url: URL | null = null;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {}
  const ownHost = SITE_HOST.split(":")[0].replace(/^www\./, "");
  const isBareId = /^\/?[A-Za-z0-9_-]{3,32}$/.test(raw);
  if (isBareId || (url && url.hostname.replace(/^www\./, "") === ownHost)) {
    const slug = isBareId ? raw.replace(/^\//, "") : url!.pathname.split("/")[1];
    return fromPastify(slug, viewerId);
  }

  if (!url) throw new Error("That doesn't look like a link.");
  const host = url.hostname.replace(/^www\./, "");
  const src = SOURCES.find((s) => s.hosts.includes(host));
  if (!src) throw new Error(`Can't clone from ${host}. Supported: ${SUPPORTED_SOURCES.join(", ")}.`);
  const rawUrl = src.raw(url);
  if (!rawUrl) throw new Error(`That ${src.name} link isn't a paste.`);
  const text = await fetchText(rawUrl);
  const name = url.pathname.split("/").filter(Boolean).pop() ?? "";
  return { title: `Cloned from ${src.name}`, content: text, format: "code", language: detectLanguage(name) ?? undefined, source: src.name };
}

async function fromPastify(slug: string, viewerId: string | null): Promise<Imported> {
  const p = await db.paste.findUnique({ where: { slug } });
  const own = !!viewerId && p?.userId === viewerId;
  if (!p || p.status !== "ACTIVE") throw new Error("Paste not found.");
  if (!own && (p.visibility === "PRIVATE" || p.passwordHash || p.earning || p.burnAfterRead || isExpired(p))) {
    throw new Error("That paste is private, locked or protected. Only its owner can clone it.");
  }
  return {
    title: p.title,
    content: p.content,
    format: p.format === "rich" ? "rich" : "code",
    language: p.language,
    filename: p.filename ?? undefined,
    source: "Pastify",
  };
}

async function fetchText(start: string) {
  let target = start;
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(target, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "PastifyImporter/1.0", accept: "text/plain,*/*" },
    });
    if (res.status >= 300 && res.status < 400) {
      const next = new URL(res.headers.get("location") ?? "", target);
      if (next.protocol !== "https:" || !RAW_REDIRECT_HOSTS.has(next.hostname)) throw new Error("The source redirected somewhere we can't follow.");
      target = next.toString();
      continue;
    }
    if (res.status === 404) throw new Error("The source says that paste doesn't exist.");
    if (!res.ok) throw new Error(`The source answered ${res.status}. Try again later.`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/plain|application\/octet-stream|charset/i.test(type)) throw new Error("The source didn't return plain text.");
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_PASTE_BYTES) throw new Error("That paste is larger than 512 KB.");
    const text = await res.text();
    if (Buffer.byteLength(text) > MAX_PASTE_BYTES) throw new Error("That paste is larger than 512 KB.");
    if (!text.trim()) throw new Error("That paste is empty.");
    return text;
  }
  throw new Error("Too many redirects.");
}
