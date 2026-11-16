"use client";
import { useState } from "react";
import { SimpleForm } from "./SimpleForm";

type S = { error?: string; ok?: string } | undefined;

export function TotpSetup({ start, confirm }: { start: () => Promise<{ secret: string; qr: string }>; confirm: (s: S, f: FormData) => Promise<S> }) {
  const [data, setData] = useState<{ secret: string; qr: string } | null>(null);
  if (!data) {
    return (
      <button className="btn btn-secondary btn-sm" onClick={async () => setData(await start())}>
        Set up two-factor sign-in
      </button>
    );
  }
  return (
    <div className="flex flex-wrap gap-5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={data.qr} alt="Scan with your authenticator app" width={160} height={160} className="rounded-lg" />
      <div className="min-w-[220px] flex-1 space-y-3">
        <p className="text-sm text-muted">Scan the code with Google Authenticator, 1Password or Authy. Or enter this key:</p>
        <code className="block break-all rounded bg-ink px-2 py-1.5 font-mono text-xs">{data.secret}</code>
        <SimpleForm action={confirm} submit="Turn on" variant="primary" className="flex flex-wrap items-start gap-2">
          <input name="code" inputMode="numeric" maxLength={8} placeholder="123456" className="input !w-36 font-mono tracking-[0.2em]" />
        </SimpleForm>
      </div>
    </div>
  );
}
