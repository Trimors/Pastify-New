"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { authenticator } from "otplib";
import { db } from "@/lib/db";
import { clientIp, createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { refCode } from "@/lib/ids";
import { rateLimit } from "@/lib/ratelimit";

export type AuthState = { error?: string; needCode?: boolean; email?: string } | undefined;

const RESERVED = new Set(["admin", "api", "dashboard", "login", "signup", "logout", "new", "explore", "earn", "pricing", "legal", "report", "docs", "u", "l", "r", "pastify", "support", "help", "settings"]);

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email.").max(200),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{3,24}$/, "Username: 3–24 letters, numbers or underscores."),
  password: z.string().min(8, "Password needs at least 8 characters.").max(200),
  terms: z.literal("on", { errorMap: () => ({ message: "Confirm you are 18+ and accept the terms." }) }),
});

export async function signup(_: AuthState, form: FormData): Promise<AuthState> {
  const ip = await clientIp();
  if (!(await rateLimit(`signup:${ip}`, 5, 3600))) return { error: "Too many sign-ups from this network. Try again later." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, username, password } = parsed.data;
  if (RESERVED.has(username)) return { error: "That username is taken." };
  const exists = await db.user.findFirst({ where: { OR: [{ email }, { username }] }, select: { email: true } });
  if (exists) return { error: exists.email === email ? "An account with this email already exists." : "That username is taken." };

  const ref = (await cookies()).get("pf_ref")?.value;
  const referrer = ref ? await db.user.findUnique({ where: { referralCode: ref }, select: { id: true } }) : null;

  let code = refCode();
  while (await db.user.findUnique({ where: { referralCode: code }, select: { id: true } })) code = refCode();

  const user = await db.user.create({
    data: {
      email,
      username,
      displayName: username,
      passwordHash: await hashPassword(password),
      referralCode: code,
      referredById: referrer?.id,
      role: process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.toLowerCase() === email ? "ADMIN" : "USER",
    },
  });
  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const ip = await clientIp();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const code = String(form.get("code") || "").replace(/\s/g, "");
  if (!(await rateLimit(`login:${ip}`, 20, 900)) || !(await rateLimit(`login:${email}`, 10, 900)))
    return { error: "Too many attempts. Wait 15 minutes.", email };
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) return { error: "Email or password is wrong.", email };
  if (user.status !== "ACTIVE") return { error: "This account is suspended. Contact support.", email };
  if (user.totpEnabled && user.totpSecret) {
    if (!code) return { needCode: true, email };
    if (!authenticator.check(code, user.totpSecret)) return { needCode: true, email, error: "That code didn't match." };
  }
  await createSession(user.id);
  const next = String(form.get("next") || "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
