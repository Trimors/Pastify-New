"use client";
import { useActionState, useState } from "react";
import Link from "next/link";

type Intensity = { id: string; label: string; hint: string };
type Action<S> = (s: S | undefined, f: FormData) => Promise<S>;

export function LockerForm({
  action,
  intensities,
  initial,
  submitLabel,
}: {
  action: Action<{ error?: string; ok?: boolean }>;
  intensities: readonly Intensity[];
  initial?: { title: string; targetUrl: string; description: string; intensity: string; waitSeconds: number };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [intensity, setIntensity] = useState(initial?.intensity ?? "standard");
  const [wait, setWait] = useState(initial?.waitSeconds ?? 0);
  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">Title</label>
        <input id="title" name="title" required maxLength={100} defaultValue={initial?.title} className="input" placeholder="Free script pack v3" />
        <p className="mt-1 text-xs text-muted">Clear, specific titles get more unlocks.</p>
      </div>
      <div>
        <label className="label" htmlFor="targetUrl">Target link</label>
        <input id="targetUrl" name="targetUrl" type="url" required maxLength={2048} defaultValue={initial?.targetUrl} className="input font-mono text-sm" placeholder="https://your-target-url.com" />
      </div>
      <div>
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={2} maxLength={300} defaultValue={initial?.description} className="input resize-none" placeholder="Optional. Shown above the unlock steps." />
      </div>
      <div>
        <p className="label">Unlock steps</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {intensities.map((i) => (
            <label key={i.id} className={`cursor-pointer rounded-lg border p-3 ${intensity === i.id ? "border-magenta/60 bg-magenta/5" : "border-line"}`}>
              <input type="radio" name="intensity" value={i.id} checked={intensity === i.id} onChange={() => setIntensity(i.id)} className="sr-only" />
              <span className="block text-sm font-semibold">{i.label}</span>
              <span className="block text-xs text-muted">{i.hint}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="waitSeconds">Extra wait</label>
        <div className="flex items-center gap-3">
          <input id="waitSeconds" name="waitSeconds" type="range" min={0} max={60} step={5} value={wait} onChange={(e) => setWait(Number(e.target.value))} className="flex-1 accent-[#D13BD0]" />
          <span className="w-12 text-right font-mono text-sm">{wait}s</span>
        </div>
        <p className="mt-1 text-xs text-muted">Optional. Longer waits lower your unlock rate.</p>
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">Saved.</p>}
      <button className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : submitLabel}</button>
    </form>
  );
}

export function BulkLockerForm({ action }: { action: Action<{ error?: string; created?: number }> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="csv">CSV · one locker per line</label>
        <textarea id="csv" name="csv" rows={7} className="input font-mono text-xs" placeholder={"title,url\nPack one,https://example.com/one\nPack two,https://example.com/two"} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select name="intensity" defaultValue="standard" className="input !w-auto text-sm">
          <option value="light">Light</option>
          <option value="standard">Standard</option>
          <option value="heavy">Heavy</option>
        </select>
        <button className="btn btn-secondary" disabled={pending}>{pending ? "Creating…" : "Create all"}</button>
      </div>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {!!state?.created && (
        <p className="text-sm text-ok">
          Created {state.created} locker{state.created > 1 ? "s" : ""}. <Link href="/dashboard/vault?tab=lockers" className="underline">Open Vault</Link>
        </p>
      )}
    </form>
  );
}
