import { NextRequest, NextResponse } from "next/server";
import { checkQuota, getCookieMaxAge, getCookieName, getIdentity } from "@/lib/quota";
import { isMockMode } from "@/lib/llm";
import { getBook } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/quota — 当前身份今日剩余生成次数 */
export async function GET(req: NextRequest) {
  const idn = getIdentity(req);
  const q = checkQuota(idn.uid);
  const resp = NextResponse.json({
    remaining: q.remaining,
    limit: q.limit,
    used: q.used,
    date: q.date,
    mock: isMockMode(),
    hasBook: !!getBook(),
  });
  if (!idn.fromCookie) {
    resp.cookies.set(getCookieName(), idn.uid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: getCookieMaxAge() });
  }
  return resp;
}
