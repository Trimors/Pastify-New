/**
 * Creates (or promotes) the admin account from ADMIN_EMAIL.
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='…' npm run db:seed
 * If ADMIN_PASSWORD is unset a random one is generated and printed once.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const db = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!email || email === "admin@example.com") throw new Error("Set ADMIN_EMAIL to your real email first.");
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: "ADMIN", status: "ACTIVE" } });
    console.log(`Promoted ${email} to admin.`);
    return;
  }
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  const username = (process.env.ADMIN_USERNAME || "admin").toLowerCase();
  await db.user.create({
    data: {
      email,
      username,
      displayName: "Pastify",
      passwordHash: await bcrypt.hash(password, 11),
      role: "ADMIN",
      referralCode: randomBytes(4).toString("hex"),
    },
  });
  console.log(`Created admin ${email} (@${username}).`);
  if (!process.env.ADMIN_PASSWORD) console.log(`Password: ${password}  ← save it, it is not stored anywhere else.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
