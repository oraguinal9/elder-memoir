// ===== LLM Provider（OpenAI 兼容接口，默认 DeepSeek）=====
// 未配置 Key 时自动 Mock：访谈引擎退化为固定问题流（不追问），成书用模板拼装。

const BASE_URL = process.env.LLM_BASE_URL || "https://api.deepseek.com/v1";
const API_KEY = process.env.LLM_API_KEY || "";
const MODEL = process.env.LLM_MODEL || "deepseek-chat";

export function isMockMode(): boolean {
  return !API_KEY;
}

export function llmInfo() {
  return { mock: isMockMode(), baseURL: BASE_URL, model: MODEL };
}

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** 一次性生成（非流式） */
export async function chat(messages: LlmMessage[], opts: { maxTokens?: number; temperature?: number } = {}): Promise<string> {
  if (isMockMode()) throw new Error("mock_mode");
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 1200,
      temperature: opts.temperature ?? 0.7,
      stream: false,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LLM 请求失败 ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}
