import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { hasGrant } from "@/lib/grant";
import { isExpired } from "@/lib/pastes";
import { richToText } from "@/lib/rich";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await db.paste.findUnique({ where: { slug } });
  const user = await getUser();
  const isOwner = !!user && user.id === p?.userId;
  const deny = (msg: string, status = 403) => new Response(msg, { status, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (!p || (p.status !== "ACTIVE" && user?.role !== "ADMIN")) return deny("Not found", 404);
  if (p.visibility === "PRIVATE" && !isOwner) return deny("Not found", 404);
  if (isExpired(p) && !isOwner) return deny("This paste expired.", 410);
  if (p.burnAfterRead && !isOwner) return deny("Open this paste on its page.");
  if (p.passwordHash && !isOwner && !(await hasGrant("pw", p.id))) return deny("Password required. Open the paste page first.");
  if (p.earning && !isOwner && !(await hasGrant("u", p.id))) return deny("Unlock this paste on its page first.");
  const download = new URL(req.url).searchParams.has("download");
  const name = (p.filename || `${p.slug}.txt`).replace(/[^\w.-]/g, "_");
  const body = p.format === "rich" ? richToText(p.content) : p.content;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex",
      "cache-control": "private, no-store",
      ...(download ? { "content-disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}
