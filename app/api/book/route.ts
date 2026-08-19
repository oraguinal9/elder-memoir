import { NextRequest, NextResponse } from "next/server";
import { buildBook, bookToMarkdown } from "@/lib/writer";
import { getCookieMaxAge, getCookieName, llmGuard } from "@/lib/quota";
import { getBook, getSession, saveBook } from "@/lib/store";

export const runtime = "nodejs";

/** GET /api/book — 获取书稿；?export=1 导出 Markdown */
export async function GET(req: NextRequest) {
  const book = getBook();
  if (!book) return NextResponse.json({ empty: true });
  if (req.nextUrl.searchParams.get("export") === "1") {
    return new NextResponse(bookToMarkdown(book), {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }
  return NextResponse.json(book);
}

/** POST /api/book — 用已完成访谈的会话生成回忆录（消耗 1 次配额） */
export async function POST(req: NextRequest) {
  try {
    const guard = llmGuard(req);
    if (guard.response) return guard.response;

    const { sessionId } = await req.json().catch(() => ({}));
    const session = sessionId ? getSession(sessionId) : null;
    if (!session || session.status !== "done") {
      return NextResponse.json({ error: "访谈尚未完成，请先完成全部提问" }, { status: 400 });
    }

    const book = await buildBook(session);
    saveBook(book);
    const resp = NextResponse.json({ ok: true, book });
    if (guard.uid && !guard.fromCookie) {
      resp.cookies.set(getCookieName(), guard.uid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: getCookieMaxAge() });
    }
    return resp;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
