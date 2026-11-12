import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="pointer-events-none absolute top-0 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-gradient opacity-10 blur-3xl" />
      <div className="relative mb-8"><Logo /></div>
      <div className="card relative w-full max-w-sm p-6">{children}</div>
    </div>
  );
}
