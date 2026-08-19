// 轻量级每日配额（进程内；单实例 PM2 足够）——限制真实 LLM 调用次数（演示防滥用）
// Mock 模式（无 Key）免费不占配额；脚本类请求由 nginx limit_req 兜底。

import { NextRequest, NextResponse } from "next/server";
import { isMockMode } from "./llm";

// 演示配额：AI 调用 12 次/天/身份（一份回忆录约 8 次：7 阶段追问 + 1 次成书）
export const AI_DAILY_LIMIT = 12;

const COOKIE_NAME = "wangshi_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

interface DayCount {
  date: string;
  ai: number;
}

const store: Map<string, DayCount> =
  ((globalThis as unknown as { __wangshiQuota?: Map<string, DayCount> }).__wangshiQuota) ||
  (((globalThis as unknown as { __wangshiQuota?: Map<string, DayCount> }).__wangshiQuota =
    new Map<string, DayCount>()));

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function sweep(): void {
  const t = today();
  for (const [k, v] of store) {
    if (v.date !== t) store.delete(k);
  }
}

export function getIdentity(req: NextRequest): { uid: string; fromCookie: boolean } {
  const cookieHeader = req.headers.get("cookie") || "";
  const m = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (m && m[1]) return { uid: m[1], fromCookie: true };
  return { uid: genUid(), fromCookie: false };
}

export function genUid(): string {
  return "w" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function getCookieName(): string {
  return COOKIE_NAME;
}

export function getCookieMaxAge(): number {
  return COOKIE_MAX_AGE;
}

function ensureToday(uid: string): DayCount {
  const t = today();
  let c = store.get(uid);
  if (!c || c.date !== t) {
    c = { date: t, ai: 0 };
    store.set(uid, c);
  }
  return c;
}

export interface QuotaResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  date: string;
}

export function checkQuota(uid: string): QuotaResult {
  sweep();
  const c = ensureToday(uid);
  const used = c.ai;
  return {
    allowed: used < AI_DAILY_LIMIT,
    limit: AI_DAILY_LIMIT,
    used,
    remaining: Math.max(0, AI_DAILY_LIMIT - used),
    date: c.date,
  };
}

export function consume(uid: string): QuotaResult {
  sweep();
  const c = ensureToday(uid);
  c.ai += 1;
  return checkQuota(uid);
}

/**
 * LLM 守卫：走真实 LLM 的 POST 路由入口调用。
 * - Mock 模式：免费放行，不占配额
 * - 有 Key：检查并消耗一次配额；超限 429
 * 写 cookie 必须用返回的 uid（与 consume 同一个）。
 */
export function llmGuard(req: NextRequest): {
  response: NextResponse | null;
  uid: string;
  fromCookie: boolean;
} {
  if (isMockMode()) return { response: null, uid: "", fromCookie: true };
  const idn = getIdentity(req);
  const quota = checkQuota(idn.uid);
  if (!quota.allowed) {
    return {
      response: NextResponse.json(
        {
          error: "今日次数已用完",
          code: "QUOTA_EXCEEDED",
          remaining: 0,
          limit: quota.limit,
          date: quota.date,
          message: `今天生成回忆录的次数已用完（${quota.limit} 次/天），明天再来吧。`,
        },
        { status: 429 },
      ),
      uid: idn.uid,
      fromCookie: idn.fromCookie,
    };
  }
  consume(idn.uid);
  return { response: null, uid: idn.uid, fromCookie: idn.fromCookie };
}
