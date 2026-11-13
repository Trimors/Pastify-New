import Link from "next/link";

export const metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-5xl font-extrabold tracking-[-0.03em]">Free to paste. Free to earn.</h1>
      <p className="mt-4 max-w-xl text-lg text-muted">Pastify makes money from the sponsors visitors see while unlocking. Creators never pay.</p>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <p className="label">Anyone</p>
          <p className="font-mono text-4xl">$0</p>
          <ul className="mt-5 space-y-2 text-sm text-muted">
            <li>Unlimited public and unlisted pastes</li>
            <li>Rich text or code with highlighting for 30+ languages</li>
            <li>Expiry, passwords and burn after reading</li>
            <li>Raw and download links</li>
          </ul>
          <Link href="/new" className="btn btn-secondary mt-6">Create paste</Link>
        </div>
        <div className="card relative overflow-hidden border-magenta/40 p-6">
          <div className="pointer-events-none absolute inset-0 bg-gradient opacity-[0.06]" />
          <p className="label !text-rose">Creators</p>
          <p className="font-mono text-4xl">$0</p>
          <ul className="relative mt-5 space-y-2 text-sm text-muted">
            <li>Everything for anyone, plus private pastes and folders</li>
            <li>Earning pastes, templates and link lockers</li>
            <li>Full analytics: countries, sources, devices</li>
            <li>Cashouts by PayPal or crypto</li>
            <li>REST API, bulk lockers, referrals</li>
            <li>Two-factor sign-in</li>
          </ul>
          <Link href="/signup" className="btn btn-primary relative mt-6">Create account</Link>
        </div>
      </div>
    </div>
  );
}
