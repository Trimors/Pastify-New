"use client";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, detectLanguage } from "@/lib/languages";
import { RichEditor } from "./RichEditor";

type Format = "code" | "rich";

type Initial = {
  title?: string;
  filename?: string;
  language?: string;
  content?: string;
  format?: Format;
  description?: string;
  tags?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  earning?: boolean;
  burnAfterRead?: boolean;
  folder?: string;
  hasPassword?: boolean;
};

type Loaded = { title: string; content: string; format: Format; language?: string; filename?: string };

type Props = {
  action: (state: { error?: string } | undefined, form: FormData) => Promise<{ error?: string } | undefined>;
  loggedIn: boolean;
  initial?: Initial;
  folders?: string[];
  templates?: { id: string; title: string }[];
  expiryOptions: { id: string; label: string }[];
  mode: "create" | "edit";
  /** Editing through an edit code: owner-only settings are hidden. */
  viaEditCode?: boolean;
  cloneAction?: (input: string) => Promise<{ error?: string; data?: Loaded & { source: string } }>;
  loadTemplateAction?: (id: string) => Promise<{ error?: string; data?: Loaded }>;
};

const FORMAT_KEY = "pastify:format";

export function PasteEditor({ action, loggedIn, initial = {}, folders = [], templates = [], expiryOptions, mode, viaEditCode, cloneAction, loadTemplateAction }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [format, setFormat] = useState<Format>(initial.format ?? "code");
  const [content, setContent] = useState(initial.content ?? "");
  const [richKey, setRichKey] = useState(0);
  const [title, setTitle] = useState(initial.title ?? "");
  const [filename, setFilename] = useState(initial.filename ?? "");
  const [language, setLanguage] = useState(initial.language ?? "auto");
  const [visibility, setVisibility] = useState(initial.visibility ?? "PUBLIC");
  const [earning, setEarning] = useState(initial.earning ?? loggedIn);
  const [burn, setBurn] = useState(initial.burnAfterRead ?? false);
  const [tool, setTool] = useState<null | "template" | "clone">(null);
  const [toolMsg, setToolMsg] = useState<string | null>(null);
  const [toolBusy, setToolBusy] = useState(false);
  const gutter = useRef<HTMLDivElement>(null);
  const ownerSettings = loggedIn && !viaEditCode;

  // Remember the last format used for new pastes.
  useEffect(() => {
    if (mode !== "create" || initial.format) return;
    try {
      const saved = localStorage.getItem(FORMAT_KEY);
      if (saved === "rich" || saved === "code") setFormat(saved);
    } catch {}
  }, [mode, initial.format]);

  function switchFormat(f: Format) {
    if (f === format) return;
    if (content && f === "code") {
      // Rich → code: keep the text, drop the formatting.
      const div = document.createElement("div");
      div.innerHTML = content.replace(/<\/(p|h1|h2|h3|li|blockquote|pre)>/g, "\n").replace(/<br\s*\/?>/g, "\n");
      setContent((div.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim());
    } else if (content && f === "rich") {
      const esc = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      setContent(esc.split("\n").map((l) => `<p>${l}</p>`).join(""));
      setRichKey((k) => k + 1);
    } else if (f === "rich") {
      setRichKey((k) => k + 1);
    }
    setFormat(f);
    try {
      localStorage.setItem(FORMAT_KEY, f);
    } catch {}
  }

  function load(d: Loaded) {
    setFormat(d.format);
    setContent(d.content);
    setRichKey((k) => k + 1);
    if (!title) setTitle(d.title);
    if (d.filename) setFilename(d.filename);
    if (d.language) setLanguage(d.language);
  }

  const lines = useMemo(() => Math.max(1, content.split("\n").length), [content]);
  const detected = detectLanguage(filename);
  const earningBlocked = !loggedIn || visibility === "PRIVATE" || burn;

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Tab") {
      e.preventDefault();
      const t = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = t;
      setContent(content.slice(0, s) + "  " + content.slice(end));
      requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2));
    }
  }

  return (
    <form
      action={formAction}
      className="grid gap-6 lg:grid-cols-[1fr_300px]"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          e.currentTarget.requestSubmit();
        }
      }}
    >
      <input type="hidden" name="format" value={format} />
      {format === "rich" && <input type="hidden" name="content" value={content} />}

      <div className="min-w-0 space-y-3">
        <input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={filename || "Title"}
          aria-label="Title"
          className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-[#4d4058]"
        />
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-2">
            <div className="inline-flex rounded-lg border border-line bg-ink p-0.5 text-xs font-semibold" role="tablist" aria-label="Paste format">
              {(["code", "rich"] as const).map((f) => (
                <button key={f} type="button" role="tab" aria-selected={format === f} onClick={() => switchFormat(f)} className={`rounded-md px-3 py-1.5 ${format === f ? "bg-surface-2 text-paper" : "text-muted hover:text-paper"}`}>
                  {f === "code" ? "Code" : "Rich text"}
                </button>
              ))}
            </div>
            {format === "code" && (
              <>
                <input name="filename" value={filename} onChange={(e) => setFilename(e.target.value)} placeholder="filename.ext" className="input !w-40 !py-1.5 font-mono text-sm" aria-label="File name" />
                <select name="language" value={language} onChange={(e) => setLanguage(e.target.value)} className="input !w-40 !py-1.5 text-sm" aria-label="Language">
                  <option value="auto">Auto{detected ? ` · ${LANGUAGES.find((l) => l.id === detected)?.label}` : ""}</option>
                  {LANGUAGES.map((l) => (
                    <option key={l.id} value={l.id}>{l.label}</option>
                  ))}
                </select>
              </>
            )}
            <div className="ml-auto flex items-center gap-1">
              {loggedIn && !viaEditCode && loadTemplateAction && (
                <button type="button" onClick={() => { setTool(tool === "template" ? null : "template"); setToolMsg(null); }} className={`btn btn-sm ${tool === "template" ? "btn-secondary" : "btn-ghost"}`}>Insert template</button>
              )}
              {cloneAction && (
                <button type="button" onClick={() => { setTool(tool === "clone" ? null : "clone"); setToolMsg(null); }} className={`btn btn-sm ${tool === "clone" ? "btn-secondary" : "btn-ghost"}`}>Clone</button>
              )}
            </div>
          </div>

          {tool === "clone" && cloneAction && (
            <div className="space-y-2 border-b border-line bg-ink/40 p-3 fade-up">
              <div className="flex flex-wrap gap-2">
                <input id="clone-src" placeholder="Paste a link or ID, e.g. pastebin.com/abc123" className="input min-w-[220px] flex-1 !py-1.5 font-mono text-sm" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click(); } }} />
                <button
                  type="button"
                  disabled={toolBusy}
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    const v = (document.getElementById("clone-src") as HTMLInputElement).value;
                    setToolBusy(true);
                    const r = await cloneAction(v);
                    setToolBusy(false);
                    if (r.error) return setToolMsg(r.error);
                    load(r.data!);
                    setToolMsg(`Cloned from ${r.data!.source}.`);
                  }}
                >
                  {toolBusy ? "Cloning…" : "Clone"}
                </button>
              </div>
              <p className="text-xs text-muted">{toolMsg ?? "Works with Pastify, Pastebin, Rentry, GitHub Gist, paste.ee and dpaste. Replaces what's in the editor."}</p>
            </div>
          )}

          {tool === "template" && loadTemplateAction && (
            <div className="space-y-2 border-b border-line bg-ink/40 p-3 fade-up">
              {templates.length ? (
                <div className="flex flex-wrap gap-2">
                  {templates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={async () => {
                        const r = await loadTemplateAction(t.id);
                        if (r.error) return setToolMsg(r.error);
                        load(r.data!);
                        setTool(null);
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">No templates yet.</p>
              )}
              <p className="text-xs text-muted">
                {toolMsg ?? "Replaces what's in the editor."} <Link href="/dashboard/templates" className="text-rose hover:underline">Manage templates</Link>
              </p>
            </div>
          )}

          {format === "rich" ? (
            <RichEditor key={richKey} value={content} onChange={setContent} />
          ) : (
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
                aria-label="Paste content"
                className="min-h-[420px] flex-1 resize-none bg-transparent py-4 pr-4 font-mono text-[13.5px] leading-[1.7] text-paper outline-none placeholder:text-[#5b4d68]"
                wrap="off"
                required
              />
            </div>
          )}
          <div className="flex justify-end border-t border-line px-3 py-1.5 font-mono text-xs text-muted">
            {format === "code" ? `${lines} lines · ` : ""}
            {new Blob([content]).size.toLocaleString()} B
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="card space-y-4 p-4">
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

          {!viaEditCode && (
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
          )}

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

          {!viaEditCode && (mode === "create" || loggedIn) && (
            <div>
              <label className="label" htmlFor="editCode">Edit code</label>
              <input id="editCode" name="editCode" autoComplete="off" minLength={6} maxLength={64} className="input font-mono text-sm" placeholder={loggedIn ? (mode === "edit" ? "Leave blank to keep" : "Optional") : "Optional · we make one"} />
              <p className="mt-1 text-xs text-muted">{loggedIn ? "Lets someone edit without your account." : "Needed to edit later. We show it once after you create the paste."}</p>
            </div>
          )}
        </div>

        {ownerSettings && (
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
