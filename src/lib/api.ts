import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import type { User } from "@prisma/client";
import { userFromApiKey } from "./apikeys";
import { rateLimit } from "./ratelimit";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "cache-control": "no-store" } });
}

export function apiError(code: string, message: string, status: number) {
  return json({ error: { code, message } }, status);
}

/** Wraps a v1 handler: API-key auth, per-key rate limit and uniform error output. */
export function withApi<C>(handler: (req: Request, user: User, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C) => {
    const user = await userFromApiKey(req);
    if (!user) return apiError("unauthorized", "Send a valid key as 'Authorization: Bearer pf_…'.", 401);
    if (!(await rateLimit(`api:${user.id}`, 120, 60))) return apiError("rate_limited", "120 requests per minute. Slow down.", 429);
    try {
      return await handler(req, user, ctx);
    } catch (e) {
      if (e instanceof ZodError) return apiError("invalid_request", e.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`).join("; "), 400);
      if (e instanceof SyntaxError) return apiError("invalid_json", "Body must be JSON.", 400);
      if (e instanceof Error && /not found/i.test(e.message)) return apiError("not_found", e.message, 404);
      if (e instanceof Error && e.message.length < 200) return apiError("invalid_request", e.message, 400);
      console.error(e);
      return apiError("server_error", "Something failed on our side.", 500);
    }
  };
}

export function pageParams(req: Request) {
  const u = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(u.searchParams.get("limit")) || 25));
  const page = Math.max(1, Number(u.searchParams.get("page")) || 1);
  return { limit, page, skip: (page - 1) * limit };
}
