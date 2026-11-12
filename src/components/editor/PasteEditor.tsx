"use client";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";
import { LANGUAGES, detectLanguage } from "@/lib/languages";

type Initial = {
  title?: string;
  filename?: string;
  language?: string;
  content?: string;
  description?: string;
  tags?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  earning?: boolean;
  burnAfterRead?: boolean;
  folder?: string;
  hasPassword?: boolean;
};

type Props = {
  action: (state: { error?: string } | undefined, form: FormData) => Promise<{ error?: string } | undefined>;
  loggedIn: boolean;
  initial?: Initial;
  folders?: string[];
  expiryOptions: { id: string; label: string }[];
  mode: "create" | "edit";
};

export function PasteEditor({ action, loggedIn, initial = {}, folders = [], expiryOptions, mode }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [content, setContent] = useState(initial.content ?? "");
  const [filename, setFilename] = useState(initial.filename ?? "");
  const [language, setLanguage] = useState(initial.language ?? "auto");
  const [visibility, setVisibility] = useState(initial.visibility ?? "PUBLIC");
  const [earning, setEarning] = useState(initial.earning ?? loggedIn);
  const [burn, setBurn] = useState(initial.burnAfterRead ?? false);
  const gutter = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => Math.max(1, content.split("\n").length), [content]);
  const detected = detectLanguage(filename);
  const earningBlocked = !loggedIn || visibility === "PRIVATE" || burn;

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = t;
      const next = content.slice(0, s) + "  " + content.slice(end);
      setContent(next);
      requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <input
            name="filename"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="filename.ext"
            className="input !w-48 !py-1.5 font-mono text-sm"
            aria-label="File name"
          />
          <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="input !w-44 !py-1.5 text-sm" aria-label="Language">
            <option value="auto">Auto{detected ? ` · ${LANGUAGES.find((l) => l.id === detected)?.label}` : ""}</option>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <span className="ml-auto font-mono text-xs text-muted">{lines} lines · {new Blob([content]).size.toLocaleString()} B</span>
        </div>
        <div className="relative flex max-h-[70vh] min-h-[420px] overflow-hidden">
          <div ref={gutter} className="select-none overflow-hidden py-4 pl-3 pr-3 text-right font-mono text-[13.5px] leading-[1.7] text-[#5b4d68]" aria-hidden>
            {Array.from({ length: lines }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <textarea
            name="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={onKeyDown}
            onScroll={(e) => {
              if (gutter.current) gutter.current.scrollTop = e.currentTarget.scrollTop;
            }}
            spellCheck={false}
            autoFocus={mode === "create"}
            placeholder="Paste or type here…"
            className="min-h-[420px] flex-1 resize-none bg-transparent py-4 pr-4 font-mono text-[13.5px] leading-[1.7] text-paper outline-none placeholder:text-[#5b4d68]"
            wrap="off"
            required
          />
        </div>
      </div>

      <aside className="space-y-5">
        <div className="card space-y-4 p-4">
          <div>
            <label className="label" htmlFor="title">Title</label>
            <input id="title" name="title" defaultValue={initial.title} maxLength={120} className="input" placeholder={filename || "Untitled paste"} />
          </div>
          <div>
            <p className="label">Visibility</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-ink p-1 text-xs font-semibold">
              {(["PUBLIC", "UNLISTED", "PRIVATE"] as const).map((v) => (
                <label key={v} className={`cursor-pointer rounded-md px-2 py-1.5 text-center ${visibility === v ? "bg-surface-2 text-paper" : "text-muted"} ${v === "PRIVATE" && !loggedIn ? "pointer-events-none opacity-40" : ""}`}>
                  <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="sr-only" />
                  {v[0] + v.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {visibility === "PUBLIC" ? "Listed on Explore and your profile." : visibility === "UNLISTED" ? "Only people with the link can open it." : "Only you can open it."}
            </p>
          </div>

          <label className={`flex items-start gap-3 rounded-lg border p-3 ${earning && !earningBlocked ? "border-pink/40 bg-pink/5" : "border-line"} ${earningBlocked ? "opacity-50" : "cursor-pointer"}`}>
            <input type="hidden" name="earning" value="false" />
            <input type="checkbox" name="earning" value="true" checked={earning && !earningBlocked} disabled={earningBlocked} onChange={(e) => setEarning(e.target.checked)} className="mt-0.5 accent-[#EF3B98]" />
            <span>
              <span className="block text-sm font-semibold">Earning</span>
              <span className="block text-xs text-muted">
                {!loggedIn ? (
                  <>
                    <Link href="/signup" className="text-rose underline">Create an account</Link> to earn from views.
                  </>
                ) : visibility === "PRIVATE" || burn ? (
                  "Not available for private or burn-after-read pastes."
                ) : (
                  "Visitors complete a quick unlock. You earn per unique unlock."
                )}
              </span>
            </span>
          </label>

          <div>
            <label className="label" htmlFor="expiry">Expires</label>
            <select id="expiry" name="expiry" className="input" defaultValue={mode === "create" ? "never" : ""}>
              {mode === "edit" && <option value="">Keep current</option>}
              {expiryOptions.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="password">Password {initial.hasPassword && <span className="normal-case tracking-normal">(set)</span>}</label>
            <input id="password" name="password" type="password" autoComplete="new-password" className="input" placeholder={initial.hasPassword ? "Leave blank to keep" : "Optional"} />
            {initial.hasPassword && (
              <label className="mt-2 flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="removePassword" className="accent-[#D13BD0]" /> Remove password
              </label>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="burnAfterRead" value="false" />
            <input type="checkbox" name="burnAfterRead" value="true" checked={burn} onChange={(e) => setBurn(e.target.checked)} className="accent-[#D13BD0]" />
            Burn after reading
          </label>
        </div>

        {loggedIn && (
          <div className="card space-y-4 p-4">
            <div>
              <label className="label" htmlFor="folder">Folder</label>
              <input id="folder" name="folder" list="folders" defaultValue={initial.folder} className="input" placeholder="None" maxLength={60} />
              <datalist id="folders">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="tags">Tags</label>
              <input id="tags" name="tags" defaultValue={initial.tags} className="input" placeholder="roblox, config, lua" />
            </div>
            <div>
              <label className="label" htmlFor="description">Description</label>
              <textarea id="description" name="description" defaultValue={initial.description} maxLength={500} rows={3} className="input resize-none" placeholder="Shown on the unlock page and link previews." />
            </div>
          </div>
        )}

        {state?.error && <p className="text-sm text-bad">{state.error}</p>}
        <button className="btn btn-primary w-full" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create paste" : "Save changes"}
        </button>
        <p className="text-center text-xs text-muted">Ctrl + Enter to {mode === "create" ? "create" : "save"}</p>
      </aside>
    </form>
  );
}
