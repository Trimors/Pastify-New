import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { LoginForm } from "../AuthForms";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getUser()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Log in</h1>
      <LoginForm next={next} />
    </>
  );
}
