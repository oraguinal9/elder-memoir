// ===== 引导式访谈引擎 =====
// 按人生阶段逐题提问：种子问题 → AI 追问 → 下一阶段。老人只需回答问题。
import { Answer, PERIODS, Session } from "./types";
import { chat, isMockMode } from "./llm";

export { PERIODS };

/** 总问题数 = 7 阶段 × (3 种子 + 1 追问) */
export const TOTAL_QUESTIONS = PERIODS.length * (PERIODS[0].questions.length + 1);

/** 新会话 */
export function createSession(subjectName: string): Session {
  const now = new Date().toISOString();
  return {
    id: "ws_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    status: "active",
    subjectName,
    startedAt: now,
    updatedAt: now,
    periodIndex: 0,
    answers: [],
    askedQuestions: [],
  };
}

export interface NextStep {
  type: "question" | "followup" | "done";
  periodIndex: number;
  periodName: string;
  periodIcon: string;
  question: string;
  progress: number; // 0-100
  answeredCount: number;
  totalQuestions: number;
}

/** 计算当前阶段内已答种子题数、是否已追问 */
function stageState(s: Session) {
  const period = PERIODS[s.periodIndex];
  const stageAnswers = s.answers.filter((a) => a.period === period.name);
  const seeds = period.questions;
  const seedAnswered = stageAnswers.filter((a) => seeds.includes(a.question)).length;
  const followupAnswered = stageAnswers.filter((a) => !seeds.includes(a.question)).length;
  return { period, stageAnswers, seedAnswered, followupAnswered };
}

function totalQuestionCount(): number {
  return TOTAL_QUESTIONS;
}

function buildStep(s: Session, type: NextStep["type"], question: string): NextStep {
  const period = PERIODS[s.periodIndex];
  const answered = s.answers.length;
  return {
    type,
    periodIndex: s.periodIndex,
    periodName: period.name,
    periodIcon: period.icon,
    question,
    progress: Math.min(100, Math.round((answered / totalQuestionCount()) * 100)),
    answeredCount: answered,
    totalQuestions: totalQuestionCount(),
  };
}

/** AI 追问：基于本阶段已答内容生成一个简短追问 */
export async function aiFollowUp(s: Session): Promise<string> {
  const { period, stageAnswers } = stageState(s);
  const content = stageAnswers.map((a) => `问：${a.question}\n答：${a.text}`).join("\n");
  if (isMockMode()) {
    return `关于「${period.name}」，您还有什么想补充的细节吗？`;
  }
  const q = await chat(
    [
      {
        role: "system",
        content:
          "你是一位耐心的回忆录访谈助手，服务对象是长辈。根据老人已经讲述的内容，生成【一个】简短的追问，用于挖掘更多细节。要求：不超过 30 个字，口语化、亲切、一次只问一件事，不要重复已问内容。直接输出问题本身，不要引号、不要前缀。",
      },
      {
        role: "user",
        content: `阶段：${period.name}\n老人已讲述：\n${content}`,
      },
    ],
    { maxTokens: 60, temperature: 0.7 },
  );
  return q.trim() || `关于「${period.name}」，您还有什么想补充的吗？`;
}

/** 判断：当前状态下，下一次 advance() 是否会在内部调用 AI 追问（用于配额预扣） */
export function willFollowup(s: Session): boolean {
  if (s.status === "done") return false;
  const { seedAnswered, followupAnswered } = stageState(s);
  const seeds = PERIODS[s.periodIndex].questions;
  return seedAnswered >= seeds.length && followupAnswered === 0;
}

/**
 * 保存一段回答并推进流程，返回下一个问题。
 * 规则：种子问题逐个问 → 种子问完 AI 追问 1 个 → 进入下一阶段 → 全部完成 done。
 */
export async function advance(
  s: Session,
  answerText: string,
  question: string,
): Promise<{ session: Session; step: NextStep }> {
  const period = PERIODS[s.periodIndex];
  // 记录回答（去重：同阶段同问题只存最新）
  const ans: Answer = { period: period.name, question, text: answerText, at: new Date().toISOString() };
  s.answers = s.answers.filter((a) => !(a.period === period.name && a.question === question));
  s.answers.push(ans);
  if (!s.askedQuestions.includes(question)) s.askedQuestions.push(question);
  s.updatedAt = new Date().toISOString();

  // 推进
  const { seedAnswered, followupAnswered } = stageState(s);
  const seeds = period.questions;
  let step: NextStep;

  if (seedAnswered < seeds.length) {
    step = buildStep(s, "question", seeds[seedAnswered]);
  } else if (followupAnswered === 0) {
    const q = await aiFollowUp(s);
    step = buildStep(s, "followup", q);
  } else if (s.periodIndex + 1 < PERIODS.length) {
    s.periodIndex += 1;
    step = buildStep(s, "question", PERIODS[s.periodIndex].questions[0]);
  } else {
    s.status = "done";
    step = buildStep(s, "done", "");
  }
  s.updatedAt = new Date().toISOString();
  return { session: s, step };
}
