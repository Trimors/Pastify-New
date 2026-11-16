"use client";
import { useEffect, useState } from "react";

function shareLinks(url: string, title: string) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
    x: `https://x.com/intent/post?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
  };
}

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const l = shareLinks(url, title);
  const items: [string, string][] = [
    ["Telegram", l.telegram],
    ["Reddit", l.reddit],
    ["X", l.x],
    ["WhatsApp", l.whatsapp],
  ];
  return (
    <div className="flex flex-wrap items-center gap-1 text-sm">
      <span className="mr-1 text-xs text-muted">Share</span>
      {items.map(([name, href]) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          {name}
        </a>
      ))}
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["E", "Edit"],
  ["C", "Copy content"],
  ["Q", "Copy link"],
  ["R", "Raw"],
  ["Shift T", "Share to Telegram"],
  ["Shift R", "Share to Reddit"],
  ["Shift X", "Share to X"],
];

export function PasteShortcuts({ url, title, copyText, editHref, rawHref }: { url: string; title: string; copyText: string | null; editHref: string | null; rawHref: string | null }) {
  const [toast, setToast] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const l = shareLinks(url, title);
    const flash = (m: string) => {
      setToast(m);
      setTimeout(() => setToast(null), 1400);
    };
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (e.shiftKey) {
        if (k === "t") window.open(l.telegram, "_blank", "noopener");
        else if (k === "r") window.open(l.reddit, "_blank", "noopener");
        else if (k === "x") window.open(l.x, "_blank", "noopener");
        else return;
      } else if (k === "e" && editHref) window.location.href = editHref;
      else if (k === "r" && rawHref) window.location.href = rawHref;
      else if (k === "q") navigator.clipboard.writeText(url).then(() => flash("Link copied."), () => {});
      else if (k === "c" && copyText !== null && !window.getSelection()?.toString()) navigator.clipboard.writeText(copyText).then(() => flash("Copied."), () => {});
      else if (k === "?") setOpen((o) => !o);
      else return;
      e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, title, copyText, editHref, rawHref]);

  return (
    <div className="relative">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        Shortcuts <kbd className="rounded border border-line px-1 font-mono text-[10px]">?</kbd>
      </button>
      {open && (
        <div className="card absolute bottom-full right-0 z-20 mb-2 w-56 p-3 text-sm fade-up">
          <ul className="space-y-1.5">
            {SHORTCUTS.map(([k, d]) => (
              <li key={k} className="flex justify-between gap-3">
                <span className="text-muted">{d}</span>
                <kbd className="rounded border border-line px-1.5 font-mono text-xs">{k}</kbd>
              </li>
            ))}
          </ul>
        </div>
      )}
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm shadow-xl fade-up" role="status">{toast}</div>}
    </div>
  );
}
