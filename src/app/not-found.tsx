import Link from "next/link";
import { Mark } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Mark size={64} animate />
      <h1 className="mt-6 text-3xl font-bold">Nothing here</h1>
      <p className="mt-2 text-muted">This link doesn&apos;t exist, or it&apos;s private.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn btn-secondary">Home</Link>
        <Link href="/new" className="btn btn-primary">New paste</Link>
      </div>
    </div>
  );
}
