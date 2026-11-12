import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

/**
 * A grant is an HMAC-signed cookie that says "this browser unlocked this item".
 * Content is only ever sent to a browser that holds a valid grant.
 */
function sign(payload: string) {
  return createHmac("sha256", process.env.AUTH_SECRET || "dev").update(payload).digest("base64url");
}

function name(kind: "u" | "pw", id: string) {
  return `pf_${kind}_${id.slice(-12)}`;
}

export async function setGrant(kind: "u" | "pw", id: string, hours = 24) {
  const exp = Date.now() + hours * 3600e3;
  const payload = `${kind}.${id}.${exp}`;
  (await cookies()).set(name(kind, id), `${exp}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: hours * 3600,
  });
}

export async function hasGrant(kind: "u" | "pw", id: string) {
  const v = (await cookies()).get(name(kind, id))?.value;
  if (!v) return false;
  const [expStr, sig] = v.split(".");
  const exp = Number(expStr);
  if (!exp || exp < Date.now() || !sig) return false;
  const expected = Buffer.from(sign(`${kind}.${id}.${exp}`));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
