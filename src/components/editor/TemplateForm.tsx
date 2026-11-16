"use client";
import { useActionState, useState } from "react";
import { RichEditor } from "./RichEditor";

export function TemplateForm({ action, initial }: { action: (s: { error?: string } | undefined, f: FormData) => Promise<{ error?: string } | undefined>; initial?: { title: string; format: "code" | "rich"; content: string } }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [format, setFormat] = useState<"code" | "rich">(initial?.format ?? "rich");
  const [content, setContent] = useState(initial?.content ?? "");
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="format" value={format} />
      {format === "rich" && <input type="hidden" name="content" value={content} />}
      <div className="flex flex-wrap gap-2">
        <input name="title" defaultValue={initial?.title} maxLength={80} required placeholder="Template name" className="input min-w-[200px] flex-1" />
        <div className="inline-flex rounded-lg border border-line bg-ink p-0.5 text-xs font-semibold">
          {(["rich", "code"] as const).map((f) => (
            <button key={f} type="button" onClick={() => { setFormat(f); setContent(""); }} className={`rounded-md px-3 py-1.5 ${format === f ? "bg-surface-2" : "text-muted"}`}>
              {f === "rich" ? "Rich text" : "Code"}
            </button>
          ))}
        </div>
      </div>
      <div className="card overflow-hidden">
        {format === "rich" ? (
          <RichEditor value={content} onChange={setContent} />
        ) : (
          <textarea name="content" value={content} onChange={(e) => setContent(e.target.value)} rows={14} spellCheck={false} className="w-full resize-y bg-transparent p-4 font-mono text-[13.5px] leading-[1.7] outline-none" placeholder="Template text…" />
        )}
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save template"}</button>
    </form>
  );
}
