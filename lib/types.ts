// ===== 往事书 · 类型定义 =====

/** 一段问答记录 */
export interface Answer {
  period: string; // 所属阶段名
  question: string; // 问题
  text: string; // 老人回答
  at: string;
}

/** 访谈会话 */
export interface Session {
  id: string;
  status: "active" | "done";
  subjectName: string;
  startedAt: string;
  updatedAt: string;
  periodIndex: number; // 当前阶段下标（0 起）
  answers: Answer[];
  askedQuestions: string[];
}

/** 人生阶段定义 */
export interface LifePeriod {
  key: string;
  name: string; // 阶段名（如「童年时光」）
  icon: string;
  questions: string[]; // 种子问题
}

export const PERIODS: LifePeriod[] = [
  {
    key: "childhood",
    name: "童年时光",
    icon: "🏡",
    questions: ["您出生在什么地方？家里有几口人？", "小时候有没有一件让您一直忘不了的事？", "小时候最喜欢吃什么、玩什么？"],
  },
  {
    key: "youth",
    name: "少年岁月",
    icon: "📚",
    questions: ["您上学的时候，哪门功课最好？", "年轻时最好的朋友是谁？你们常在一起做什么？", "那时候您有什么爱好或者梦想？"],
  },
  {
    key: "young-adult",
    name: "青春年华",
    icon: "🌱",
    questions: ["您年轻时候做的第一份工作是什么？", "那时候一个月挣多少钱？日子是怎么过的？", "年轻时候有没有特别想去的地方？"],
  },
  {
    key: "family",
    name: "婚姻家庭",
    icon: "❤️",
    questions: ["您和老伴是怎么认识的？", "孩子出生的时候，您还记得当时的心情吗？", "家庭里有没有让您特别幸福的一刻？"],
  },
  {
    key: "career",
    name: "工作事业",
    icon: "💼",
    questions: ["您做了一辈子的工作里，最自豪的是什么？", "工作中有没有遇到过特别难的坎？是怎么挺过来的？", "有没有带过徒弟、教过别人？"],
  },
  {
    key: "retirement",
    name: "晚年生活",
    icon: "🌅",
    questions: ["现在您每天的生活是怎么过的？", "平时有什么爱好？跳广场舞、下棋、还是养花？", "孩子们现在都怎么样？常回来看您吗？"],
  },
  {
    key: "wisdom",
    name: "人生感悟",
    icon: "💡",
    questions: ["这辈子您觉得最幸福的事是什么？", "有没有什么后悔的事，想跟后辈说？", "您最想对子孙说的一句话是什么？"],
  },
];

export const TOTAL_PERIODS = PERIODS.length;

/** 生成的书稿 */
export interface Book {
  id: string;
  title: string;
  subjectName: string;
  createdAt: string;
  preface: string;
  chapters: { period: string; title: string; content: string }[];
  epilogue: string;
}
