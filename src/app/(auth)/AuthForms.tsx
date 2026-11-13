"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup, type AuthState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, undefined);
  const [pw, setPw] = useState("");
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className={state?.needCode ? "hidden" : "space-y-4"}>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className="input" defaultValue={state?.email} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
      </div>
      {state?.needCode && (
        <div>
          <label className="label" htmlFor="code">Authenticator code</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" autoFocus className="input font-mono tracking-[0.3em]" placeholder="123456" maxLength={8} />
          <p className="mt-2 text-xs text-muted">Open your authenticator app and enter the 6-digit code.</p>
        </div>
      )}
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Signing in…" : state?.needCode ? "Verify" : "Log in"}</button>
      <p className="text-center text-sm text-muted">
        New here? <Link href="/signup" className="text-rose hover:underline">Create an account</Link>
      </p>
    </form>
  );
}

export function SignupForm({ referred, next }: { referred?: string; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next ?? ""} />
      {referred && <p className="rounded-lg border border-pink/30 bg-pink/10 px-3 py-2 text-sm text-rose">Invited by {referred}</p>}
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="username">Username</label>
        <input id="username" name="username" required pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" className="input" placeholder="yourname" />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input id="password" name="password" type="password" minLength={8} required autoComplete="new-password" className="input" />
      </div>
      <label className="flex items-start gap-2 text-sm text-muted">
        <input type="checkbox" name="terms" className="mt-1 accent-[#D13BD0]" />
        <span>
          I am 18 or older and accept the <Link href="/legal/terms" className="text-rose hover:underline">Terms</Link> and{" "}
          <Link href="/legal/content" className="text-rose hover:underline">Content policy</Link>.
        </span>
      </label>
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm text-muted">
        Have an account? <Link href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} className="text-rose hover:underline">Log in</Link>
      </p>
    </form>
  );
}
