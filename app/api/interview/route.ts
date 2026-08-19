import { NextRequest, NextResponse } from "next/server";
import { advance, createSession, PERIODS, TOTAL_QUESTIONS, willFollowup } from "@/lib/interview";
import { getCookieMaxAge, getCookieName, llmGuard } from "@/lib/quota";
import { getSession, getSubjectName, saveSession } from "@/lib/store";

export const runtime = "nodejs";

function setUidCookie(resp: NextResponse, uid: string, fromCookie: boolean): void {
  if (uid && !fromCookie) {
    resp.cookies.set(getCookieName(), uid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: getCookieMaxAge() });
  }
}

/** POST /api/interview — 提交一条回答，返回下一个问题（或 done）。
 *  配额：仅当本次回答会触发 AI 追问时消耗 1 次；种子题免费。 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sessionId: string | undefined = body.sessionId;
  const subjectName: string | undefined = body.subjectName;
  const question: string = String(body.question || "");
  const answer: string = String(body.answer || "").trim();

  let session = sessionId ? getSession(sessionId) : null;
  if (!session) session = createSession(subjectName || getSubjectName());

  // 无回答：返回当前应问的种子问题（免费，不消耗配额）
  if (!answer) {
    const period = PERIODS[session.periodIndex];
    const seeds = period.questions;
    const seedAnswered = session.answers.filter(
      (a) => a.period === period.name && seeds.includes(a.question),
    ).length;
    const questionToAsk = seedAnswered < seeds.length ? seeds[seedAnswered] : null;
    const step = questionToAsk
      ? {
          type: "question" as const,
          periodIndex: session.periodIndex,
          periodName: period.name,
          periodIcon: period.icon,
          question: questionToAsk,
          progress: Math.min(100, Math.round((session.answers.length / 21) * 100)),
          answeredCount: session.answers.length,
          totalQuestions: TOTAL_QUESTIONS,
        }
      : { type: "continue" as const, message: "请先回答当前问题" };
    saveSession(session);
    const resp = NextResponse.json({ ok: true, step, sessionId: session.id });
    setUidCookie(resp, "", true); // 不消耗，不种 cookie（保持幂等）
    return resp;
  }

  // 有回答：若本次提交后将触发 AI 追问 → 预扣配额（超限 429）
  let guard: { response: NextResponse | null; uid: string; fromCookie: boolean } = { response: null, uid: "", fromCookie: true };
  if (willFollowup(session)) {
    guard = llmGuard(req);
    if (guard.response) return guard.response;
  }

  const { session: updated, step } = await advance(session, answer, question);
  saveSession(updated);

  const resp = NextResponse.json({ ok: true, step, sessionId: updated.id });
  setUidCookie(resp, guard.uid, guard.fromCookie);
  return resp;
}
