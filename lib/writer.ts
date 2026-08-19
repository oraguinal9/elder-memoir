// ===== 成书引擎 =====
// 依据访谈问答，按人生阶段生成回忆录（前言 + 7 章 + 后记）。
// 真实 LLM：每章单独生成（第一人称叙述，保留真实细节）；Mock：模板拼装。
import { Book, PERIODS, Session } from "./types";
import { chat, isMockMode } from "./llm";
import { uid } from "./store";

function answersOf(s: Session, periodName: string) {
  return s.answers.filter((a) => a.period === periodName);
}

/** 单章生成（真实 LLM） */
async function genChapter(s: Session, periodName: string): Promise<string> {
  const list = answersOf(s, periodName);
  const material = list.map((a) => `问题：${a.question}\n回答：${a.text}`).join("\n\n");
  if (isMockMode()) {
    return list.map((a) => a.text).filter(Boolean).join("\n\n") || `（关于${periodName}，暂时没有留下记录。）`;
  }
  const q = await chat(
    [
      {
        role: "system",
        content:
          "你是回忆录作家。请把老人对某个生命阶段的回答，改写为一章流畅的第一人称回忆录（300 字左右）。要求：保持原文的真实细节和人名地名，语气质朴温暖、像老人自己在说话，不编造事实，不添加未提及的内容。直接输出正文，不要标题、不要解释。",
      },
      {
        role: "user",
        content: `阶段：${periodName}\n素材：\n${material}`,
      },
    ],
    { maxTokens: 600, temperature: 0.7 },
  );
  return q.trim() || "（本章内容正在整理中。）";
}

/** 前言 + 后记（真实 LLM 合并一次调用） */
async function genPrefaceEpilogue(s: Session): Promise<{ preface: string; epilogue: string }> {
  const all = s.answers.map((a) => a.text).join(" ");
  if (isMockMode()) {
    return {
      preface: `这本书，记录的是${s.subjectName}的一生。从童年到晚年，每一段时光都是岁月的礼物。愿这些文字，成为家人心中最珍贵的记忆。`,
      epilogue: `感谢您读到这里。${s.subjectName}的人生故事，是留给子孙最好的家书。愿这份记忆代代相传。`,
    };
  }
  const text = await chat(
    [
      {
        role: "system",
        content:
          "你是回忆录作家。根据老人的全部讲述，写两段话，用「|||」分隔：第一段是全书前言（150 字左右，温暖概括老人的人生）；第二段是后记（120 字左右，写给后辈的寄语）。第一人称，质朴温暖，不编造。",
      },
      { role: "user", content: `讲述内容：\n${all}` },
    ],
    { maxTokens: 500, temperature: 0.8 },
  );
  const [preface = "", epilogue = ""] = text.split("|||").map((t) => t.trim());
  return {
    preface: preface || "愿这本书，成为家人心中最珍贵的记忆。",
    epilogue: epilogue || "这份记忆，愿代代相传。",
  };
}

/** 依据会话生成整本书（内部多次 LLM 调用，由外层配额约束用户操作次数） */
export async function buildBook(s: Session): Promise<Book> {
  const { preface, epilogue } = await genPrefaceEpilogue(s);
  const chapters = [];
  for (const period of PERIODS) {
    const content = await genChapter(s, period.name);
    chapters.push({ period: period.name, title: `${period.icon} ${period.name}`, content });
  }
  return {
    id: uid("bk"),
    title: `${s.subjectName}的回忆录`,
    subjectName: s.subjectName,
    createdAt: new Date().toISOString(),
    preface,
    chapters,
    epilogue,
  };
}

/** Markdown 导出 */
export function bookToMarkdown(book: Book): string {
  const parts = [
    `# ${book.title}`,
    ``,
    `## 前言`,
    book.preface,
    ``,
  ];
  for (const ch of book.chapters) {
    parts.push(`## ${ch.title}`, ch.content, ``);
  }
  parts.push(`## 后记`, book.epilogue, ``);
  return parts.join("\n");
}
