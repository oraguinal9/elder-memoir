"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Chapter {
  period: string;
  title: string;
  content: string;
}
interface Book {
  title: string;
  subjectName: string;
  preface: string;
  chapters: Chapter[];
  epilogue: string;
}

export default function Book() {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/book", { cache: "no-store" });
        const d = await res.json();
        if (!d.empty) setBook(d);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, []);

  function printBook() {
    window.print();
  }

  if (loading) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: "6rem" }}>
        <div style={{ fontSize: "3rem" }}>⏳</div>
        <p style={{ fontSize: "1.3rem", marginTop: "1rem" }}>正在翻开您的回忆录…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "3rem" }}>📖</div>
        <p style={{ fontSize: "1.3rem", margin: "1.5rem 0" }}>还没有回忆录，先去讲一讲您的人生故事吧。</p>
        <Link href="/"><button className="btn-main" style={{ margin: "0 auto" }}>开始讲述</button></Link>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="no-print" style={{ display: "flex", gap: "1rem", justifyContent: "center", marginBottom: "2rem" }}>
        <button className="btn-main" onClick={printBook} style={{ maxWidth: 240, padding: "0.9rem 1rem", fontSize: "1.1rem" }}>
          🖨️ 打印 / 保存成书
        </button>
        <Link href="/interview" style={{ textDecoration: "none" }}>
          <button className="btn-main secondary" style={{ maxWidth: 240, padding: "0.9rem 1rem", fontSize: "1.1rem" }}>
            ↩ 回到讲述
          </button>
        </Link>
      </div>

      <div className="book-title">{book.title}</div>
      <div className="book-sub">—— 送给家人与岁月 ——</div>

      <div className="card">
        <div className="book-chapter">
          <h2>前言</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{book.preface}</p>
        </div>
      </div>

      {book.chapters.map((ch, i) => (
        <div className="card" key={i}>
          <div className="book-chapter">
            <h2>{ch.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>{ch.content}</p>
          </div>
        </div>
      ))}

      <div className="card">
        <div className="book-chapter">
          <h2>后记</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{book.epilogue}</p>
        </div>
      </div>
    </div>
  );
}
