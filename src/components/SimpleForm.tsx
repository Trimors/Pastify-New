"use client";
import { useActionState } from "react";

type S = { error?: string; ok?: string } | undefined;

/** Generic small form: renders children inputs plus status and a submit button. */
export function SimpleForm({ action, children, submit, className = "space-y-3", variant = "secondary" }: { action: (s: S, f: FormData) => Promise<S>; children: React.ReactNode; submit: string; className?: string; variant?: "primary" | "secondary" | "danger" }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
      <button className={`btn btn-${variant} btn-sm`} disabled={pending}>{pending ? "Saving…" : submit}</button>
    </form>
  );
}
