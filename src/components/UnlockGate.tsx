"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppIcon } from "./Logo";
import { AdSlot } from "./AdSlot";

type Step = { kind: "view" | "sponsor" | "wait"; seconds: number; url: string | null };
type Session = { id: string; steps: Step[]; pow: { salt: string; bits: number } };

const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

declare global {
  interface Window {
    turnstile?: { render: (el: HTMLElement, opts: Record<string, unknown>) => string };
  }
}

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
    if (n % 3000 === 0) await new Promise((r) => setTimeout(r, 0));
  }
}

const LABELS: Record<Step["kind"], [string, string]> = {
  view: ["Quick check", "Confirming you're a real visitor."],
  sponsor: ["Visit sponsor", "Open the sponsor page, then come back here."],
  wait: ["Short wait", "The creator added a short wait."],
};

export function UnlockGate({ kind, slug, onDoneHref }: { kind: "paste" | "locker"; slug: string; onDoneHref?: string }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [sponsorOpened, setSponsorOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const nonce = useRef<Promise<string> | null>(null);
  const tsToken = useRef<string | undefined>(undefined);
  const tsBox = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    setDone(true);
    if (onDoneHref) window.location.href = onDoneHref;
    else router.refresh();
  }, [onDoneHref, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/unlock/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, slug, referrer: document.referrer }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (data.granted) return finish();
        if (!res.ok) {
          setError(data.error === "rate_limited" ? "Too many requests. Wait a minute and reload." : "This link isn't available.");
          return;
        }
        setSession(data);
        nonce.current = solvePow(data.pow.salt, data.pow.bits);
      } catch {
        if (!cancelled) setError("Network error. Reload the page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, slug, finish]);

  // Turnstile (optional)
  useEffect(() => {
    if (!TS_KEY || !session) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => {
      if (tsBox.current && window.turnstile)
        window.turnstile.render(tsBox.current, { sitekey: TS_KEY, theme: "dark", callback: (t: string) => (tsToken.current = t) });
    };
    document.head.appendChild(s);
  }, [session]);

  const step = session?.steps[index];

  // Countdown for the current step. Sponsor steps start counting once the sponsor is opened.
  useEffect(() => {
    if (!step) return;
    if (step.kind === "sponsor" && step.url && !sponsorOpened) {
      setRemaining(null);
      return;
    }
    let left = step.seconds;
    setRemaining(left);
    const t = setInterval(() => {
      left -= 1;
      setRemaining(Math.max(0, left));
      if (left <= 0) clearInterval(t);
    }, 1000);
    return () => clearInterval(t);
  }, [step, sponsorOpened]);

  async function advance() {
    if (!session || busy) return;
    setBusy(true);
    setError(null);
    try {
      const n = index === 0 && nonce.current ? await nonce.current : undefined;
      const res = await fetch("/api/unlock/step", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: session.id, index, nonce: n, turnstile: tsToken.current }),
      });
      const data = await res.json();
      if (res.status === 425) {
        setRemaining(Math.ceil(data.waitMs / 1000));
        setError("Almost. Give it a second.");
      } else if (!res.ok) {
        setError(
          data.error === "captcha_failed"
            ? "Complete the check above first."
            : data.error === "blocked"
              ? "Automated browsers can't unlock. Open this link in a normal browser."
              : data.error === "expired"
              ? "This unlock timed out. Reload the page."
              : "That didn't go through. Reload and try again.",
        );
      } else if (data.done) {
        finish();
      } else {
        setSponsorOpened(false);
        setIndex(data.index);
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const total = session?.steps.length ?? 0;
  const ready = remaining === 0;

  return (
    <div className="card mx-auto max-w-xl overflow-hidden fade-up">
      <div className="h-1 bg-line">
        <div className="h-full bg-bar transition-all duration-500" style={{ width: `${total ? ((done ? total : index) / total) * 100 : 0}%` }} />
      </div>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <AppIcon size={36} />
          <div>
            <p className="font-semibold">Unlock this {kind === "paste" ? "paste" : "link"}</p>
            <p className="text-sm text-muted">{total ? `${total} quick step${total > 1 ? "s" : ""}. Free, no account needed.` : "Loading…"}</p>
          </div>
        </div>

        {session && (
          <ol className="mt-6 space-y-2">
            {session.steps.map((s, i) => {
              const state = done || i < index ? "done" : i === index ? "active" : "todo";
              return (
                <li key={i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${state === "active" ? "border-magenta/50 bg-magenta/5" : "border-line"}`}>
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${state === "done" ? "bg-ok/20 text-ok" : state === "active" ? "bg-gradient text-white" : "bg-surface-2 text-muted"}`}>
                    {state === "done" ? "✓" : i + 1}
                  </span>
                  <span className="flex-1">
                    <span className="font-medium">{LABELS[s.kind][0]}</span>
                    {state === "active" && <span className="block text-xs text-muted">{LABELS[s.kind][1]}</span>}
                  </span>
                  {state === "active" && remaining !== null && remaining > 0 && <span className="font-mono text-xs text-muted">{remaining}s</span>}
                </li>
              );
            })}
          </ol>
        )}

        {step?.kind === "view" && !done && <AdSlot className="mt-5" />}

        {TS_KEY && index === 0 && <div ref={tsBox} className="mt-4 flex justify-center" />}

        {error && <p className="mt-4 text-sm text-bad">{error}</p>}

        {step && !done && (
          <div className="mt-6">
            {step.kind === "sponsor" && step.url && !sponsorOpened ? (
              <a
                href={step.url}
                target="_blank"
                rel="noopener noreferrer sponsored"
                onClick={() => setSponsorOpened(true)}
                className="btn btn-primary w-full"
              >
                Open sponsor
              </a>
            ) : (
              <button onClick={advance} disabled={!ready || busy} className="btn btn-primary w-full">
                {busy ? "Checking…" : ready ? (index === total - 1 ? (kind === "paste" ? "Unlock paste" : "Unlock link") : "Continue") : `Wait ${remaining ?? ""}s`}
              </button>
            )}
          </div>
        )}
        {done && <p className="mt-6 text-center text-sm text-ok">Unlocked. Opening…</p>}
      </div>
    </div>
  );
}
