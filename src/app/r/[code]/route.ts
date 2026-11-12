import { NextResponse } from "next/server";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/signup", req.url));
  if (/^[a-z0-9]{3,32}$/.test(code)) {
    res.cookies.set("pf_ref", code, { httpOnly: true, sameSite: "lax", maxAge: 30 * 86400, path: "/" });
  }
  return res;
}
