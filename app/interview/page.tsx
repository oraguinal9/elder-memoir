"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Step {
  type: "question" | "followup" | "done" | "continue";
  periodName?: string;
  periodIcon?: string;
  question?: string;
  progress?: number;
  answeredCount?: number;
  totalQuestions?: number;
}

interface HistoryItem {
  q: string;
  a: string;
}

export default function Interview() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string>("");
  const [step, setStep] = useState<Step | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // 语音
  const [listening, setListening] = useState(false);
  const [voiceSupported] = useState(() => typeof window !== "undefined" && !!getSpeechRecognition());
  const recRef = useRef<ReturnType<typeof getSpeechRecognition> | null>(null);

  function getSpeechRecognition(): any {
    const w = window as any;
    return w.SpeechRecognition || w.webkitSpeechRecognition;
  }

  // 首次进入：取第一个问题
  const name = typeof window !== "undefined" ? sessionStorage.getItem("ws_name") || "" : "";

  const fetchNext = useCallback(async (question: string, answerText: string, sid: string) => {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sid, subjectName: name, question, answer: answerText }),
    });
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      setError(d.message || "今天次数已用完，明天再来吧。");
      return null;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "出错了，请重试。");
      return null;
    }
    return (await res.json()) as { ok: boolean; step: Step; sessionId: string };
  }, [name]);

  useEffect(() => {
    (async () => {
      const d = await fetchNext("", "", "");
      if (d) {
        setSessionId(d.sessionId);
        setStep(d.step);
      }
      setLoading(false);
    })();
  }, [fetchNext]);

  // 语音识别
  const toggleListen = useCallback(() => {
    if (!voiceSupported) return;
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getSpeechRecognition();
    const r = new rec();
    recRef.current = r;
    r.lang = "zh-CN";
    r.interimResults = false;
    r.onresult = (e: any) => {
      const t = Array.from(e.results as any[]).map((x) => x[0].transcript).join("");
      setAnswer((prev) => (prev ? prev + t : t));
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  }, [listening, voiceSupported]);

  // 播报问题
  const speak = useCallback(() => {
    if (!step?.question) return;
    const u = new SpeechSynthesisUtterance(step.question);
    u.lang = "zh-CN";
    u.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }, [step]);

  async function submit() {
    if (!step?.question) return;
    const text = answer.trim();
    if (!text) {
      setError("请先说话或输入您的回答。");
      return;
    }
    setError("");
    setLoading(true);
    const d = await fetchNext(step.question, text, sessionId);
    setLoading(false);
    if (!d) return;
    setHistory((h) => [...h, { q: step.question!, a: text }]);
    setAnswer("");
    setStep(d.step);
    if (d.step.type === "done") {
      // 进入成书
      await finishBook(d.sessionId);
    }
  }

  async function finishBook(sid: string) {
    setLoading(true);
    const res = await fetch("/api/book", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId: sid }),
    });
    setLoading(false);
    if (res.status === 429) {
      const d = await res.json().catch(() => ({}));
      setError(d.message || "今天生成次数已用完，明天再来吧。");
      return;
    }
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "生成失败，请重试。");
      return;
    }
    router.push("/book");
  }

  function skip() {
    // 跳过：提交一个占位回答，推进流程
    if (!step?.question) return;
    submitWithText("（这个问题我不想说，跳过。）");
  }

  async function submitWithText(text: string) {
    setError("");
    setLoading(true);
    const d = await fetchNext(step!.question!, text, sessionId);
    setLoading(false);
    if (!d) return;
    setHistory((h) => [...h, { q: step!.question!, a: text }]);
    setAnswer("");
    setStep(d.step);
    if (d.step.type === "done") await finishBook(d.sessionId);
  }

  if (loading && !step) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: "6rem" }}>
        <div style={{ fontSize: "3rem" }}>⏳</div>
        <p style={{ fontSize: "1.3rem", marginTop: "1rem" }}>正在准备第一个问题…</p>
      </div>
    );
  }

  if (step?.type === "done") {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "4rem" }}>🎉</div>
        <h1 className="book-title" style={{ marginTop: "1rem" }}>讲述完成！</h1>
        <p style={{ fontSize: "1.3rem", margin: "1.5rem 0" }}>正在为您编写回忆录，请稍等…</p>
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <span className="badge">{step?.periodIcon} {step?.periodName}</span>
        <span style={{ fontSize: "0.95rem", color: "var(--ink-soft)" }}>已答 {step?.answeredCount ?? 0} / {step?.totalQuestions ?? 21}</span>
      </div>
      <div className="progress-track"><div className="progress-fill" style={{ width: `${step?.progress ?? 0}%` }} /></div>
      <div className="progress-label">故事讲到哪里了，一目了然</div>

      {error && <div className="error-box">{error}</div>}

      <div className="card" style={{ textAlign: "center" }}>
        <div className="question">{step?.question}</div>
        <button className="btn-main secondary" onClick={speak} style={{ maxWidth: 260, padding: "0.8rem 1.5rem", fontSize: "1.1rem", margin: "0 auto 1.8rem" }}>
          🔊 听一听这个问题
        </button>

        {voiceSupported && (
          <>
            <button className={`voice-btn ${listening ? "recording" : ""}`} onClick={toggleListen} disabled={loading}>
              {listening ? "🎤 正在听…\n点我停止" : "🎤\n按住说话"}
              <span style={{ fontSize: "0.85rem" }}>{listening ? "录音中" : "点我开始"}</span>
            </button>
            <p className="hint">{listening ? "请慢慢说，说完点一下按钮" : "点一下，说话就行；不想说也可以打字"}</p>
          </>
        )}

        <textarea
          className="answer-input"
          style={{ marginTop: "1.5rem" }}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder={voiceSupported ? "说的话会出现在这里，也可以直接打字" : "在这里输入您的回答"}
        />

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", marginTop: "1.5rem" }}>
          <button className="btn-main secondary" onClick={skip} disabled={loading} style={{ maxWidth: 200, padding: "0.9rem 1rem", fontSize: "1.05rem" }}>
            这个问题跳过
          </button>
          <button className="btn-main" onClick={submit} disabled={loading} style={{ maxWidth: 200, padding: "0.9rem 1rem", fontSize: "1.05rem" }}>
            {loading ? "正在想下一个问题…" : "讲好了，继续"}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="answer-history">
          <h3>📜 已经讲过的（点击可回忆）</h3>
          {history.map((h, i) => (
            <div className="history-item" key={i}>
              <div className="q">{h.q}</div>
              <div className="a">{h.a}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
