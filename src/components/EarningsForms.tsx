"use client";
import { useActionState, useState } from "react";

type S = { error?: string; ok?: string } | undefined;
type A = (s: S, f: FormData) => Promise<S>;

export function PayoutMethodForm({ action, methods, current }: { action: A; methods: readonly { id: string; label: string; placeholder: string }[]; current: { method: string | null; destination: string | null } }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [method, setMethod] = useState(current.method ?? methods[0].id);
  const ph = methods.find((m) => m.id === method)?.placeholder;
  return (
    <form action={formAction} className="space-y-3">
      <select name="method" value={method} onChange={(e) => setMethod(e.target.value)} className="input">
        {methods.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
      <input name="destination" defaultValue={current.destination ?? ""} placeholder={ph} className="input font-mono text-sm" required />
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
      <button className="btn btn-secondary btn-sm" disabled={pending}>Save</button>
    </form>
  );
}

export function CashoutForm({ action, balance, min, disabled }: { action: A; balance: number; min: number; disabled?: string }) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className="space-y-3">
      <div className="flex gap-2">
        <span className="flex items-center rounded-lg border border-line bg-ink px-3 font-mono text-muted">$</span>
        <input name="amount" type="number" step="0.01" min={min} max={balance} defaultValue={Math.floor(balance * 100) / 100} className="input font-mono" />
      </div>
      {disabled && <p className="text-xs text-muted">{disabled}</p>}
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">{state.ok}</p>}
      <button className="btn btn-primary w-full" disabled={pending || !!disabled}>{pending ? "Requesting…" : "Request cashout"}</button>
    </form>
  );
}
