"use client";
import { useActionState } from "react";
import { CopyButton } from "./CopyButton";

export function NewKeyForm({ action }: { action: (s: { error?: string; key?: string } | undefined, f: FormData) => Promise<{ error?: string; key?: string }> }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <div className="space-y-3">
      <form action={formAction} className="flex flex-wrap gap-2">
        <input name="name" placeholder="Key name, e.g. Discord bot" maxLength={40} className="input !w-auto flex-1" />
        <button className="btn btn-primary btn-sm" disabled={pending}>Create key</button>
      </form>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.key && (
        <div className="rounded-lg border border-magenta/40 bg-magenta/5 p-3">
          <p className="mb-2 text-sm">Copy this key now. It won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-ink px-2 py-1.5 font-mono text-xs">{state.key}</code>
            <CopyButton text={state.key} />
          </div>
        </div>
      )}
    </div>
  );
}
