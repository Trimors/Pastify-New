import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SignupForm } from "../AuthForms";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  if (await getUser()) redirect("/dashboard");
  const ref = (await cookies()).get("pf_ref")?.value;
  const referrer = ref ? await db.user.findUnique({ where: { referralCode: ref }, select: { username: true } }) : null;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight">Create account</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Free. Start earning from your pastes today.</p>
      <SignupForm referred={referrer?.username} />
    </>
  );
}
