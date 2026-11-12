import { customAlphabet } from "nanoid";
import { randomBytes, createHash } from "crypto";

const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
export const shortId = customAlphabet(alphabet, 6);
export const refCode = customAlphabet("abcdefghjkmnpqrstuvwxyz23456789", 7);

export function token(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
