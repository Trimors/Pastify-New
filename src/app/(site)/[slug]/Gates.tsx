"use client";
import { useActionState, useState } from "react";
import { revealBurn, unlockPassword } from "./actions";
import { CopyButton } from "@/components/CopyButton";

export function PasswordGate({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(unlockPassword.bind(null, slug), undefined);
  return (
    <form action={action} className="card mx-auto max-w-sm space-y-4 p-6">
      <p className="font-semibold">This paste is password protected</p>
      <input name="password" type="password" required autoFocus className="input" placeholder="Password" />
      {state?.error && <p className="text-sm text-bad">{state.error}</p>}
      <button className="btn btn-primary w-full" disabled={pending}>{pending ? "Checking…" : "Open paste"}</button>
    </form>
  );
}

export function BurnGate({ slug }: { slug: string }) {
  const [data, setData] = useState<{ content?: string; html?: string | null; rich?: boolean; error?: string } | null>(null);
  const [pending, setPending] = useState(false);
  if (data?.content !== undefined) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
          <span>This paste is now deleted. Copy anything you need before leaving.</span>
          <CopyButton text={data.content} />
        </div>
        {data.rich ? <RichBlock html={data.html ?? ""} /> : <CodeBlock html={data.html ?? null} content={data.content} />}
      </div>
    );
  }
  return (
    <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
      <p className="font-semibold">Burn after reading</p>
      <p className="text-sm text-muted">This paste is deleted as soon as you open it.</p>
      {data?.error && <p className="text-sm text-bad">{data.error}</p>}
      <button
        className="btn btn-primary w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setData(await revealBurn(slug));
          setPending(false);
        }}
      >
        {pending ? "Opening…" : "Open and delete"}
      </button>
    </div>
  );
}

export function CodeBlock({ html, content }: { html: string | null; content: string }) {
  return (
    <div className="card code-view overflow-x-auto py-4">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>
            {content.split("\n").map((l, i) => (
              <span key={i} className="line">
                {l}
                {"\n"}
              </span>
            ))}
          </code>
        </pre>
      )}
    </div>
  );
}

export function RichBlock({ html }: { html: string }) {
  return <div className="card rich-content rich-view px-6 py-5" dangerouslySetInnerHTML={{ __html: html }} />;
}
