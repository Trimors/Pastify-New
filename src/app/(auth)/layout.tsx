import { Logo } from "@/components/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="relative mb-8"><Logo /></div>
      <div className="glass-frame relative w-full max-w-sm">
        <div className="card p-6">{children}</div>
      </div>
    </div>
  );
}
