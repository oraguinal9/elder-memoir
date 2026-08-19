"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    try {
      // 先种身份 cookie，再进入访谈
      await fetch("/api/quota", { cache: "no-store" });
      const q = await (await fetch("/api/quota")).json();
      if (!q.mock && q.remaining <= 0) {
        alert("今天生成回忆录的次数已用完，明天再来吧。");
        setStarting(false);
        return;
      }
      sessionStorage.setItem("ws_name", name.trim() || "");
      router.push("/interview");
    } catch {
      router.push("/interview");
    }
  }

  return (
    <div className="page">
      <div className="card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📖</div>
        <h1 className="book-title" style={{ margin: 0 }}>往事书</h1>
        <p className="book-sub">用说话的方式，留下一本自己的回忆录</p>

        <div className="steps">
          <div className="step"><b>①</b>回答提问<br />（会说就行）</div>
          <div className="step"><b>②</b>讲了就算录了<br />（语音转文字）</div>
          <div className="step"><b>③</b>自动成书<br />（可打印珍藏）</div>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="怎么称呼您？如：王奶奶（可不填）"
          style={{
            width: "100%", maxWidth: 420, padding: "1rem", fontSize: "1.15rem",
            border: "2px solid var(--border)", borderRadius: 14, fontFamily: "inherit",
            marginBottom: "1.5rem", background: "#fffdf9",
          }}
        />

        <button className="btn-main" onClick={start} disabled={starting} style={{ margin: "0 auto" }}>
          {starting ? "正在准备…" : "开始讲述我的故事"}
        </button>

        <p className="hint" style={{ marginTop: "1.5rem" }}>
          会问一些关于童年、家庭、工作的小问题，<br />您怎么想就怎么说，不用准备。
        </p>
      </div>
    </div>
  );
}
