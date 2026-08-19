// ===== JSON 文件存储（服务端专用；client 组件勿 import）=====
import fs from "fs";
import path from "path";
import { Book, Session } from "./types";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function ensure(): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(name: string, fallback: T): T {
  ensure();
  const p = path.join(DATA_DIR, name);
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson(name: string, data: unknown): void {
  ensure();
  fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data, null, 2), "utf8");
}

export function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ===== 会话 =====
const SESSION_FILE = "sessions.json";

export function saveSession(s: Session): void {
  const all = readJson<Record<string, Session>>(SESSION_FILE, {});
  all[s.id] = s;
  writeJson(SESSION_FILE, all);
}

export function getSession(id: string): Session | null {
  const all = readJson<Record<string, Session>>(SESSION_FILE, {});
  return all[id] || null;
}

export function setSubjectName(name: string): void {
  const all = readJson<Record<string, Session>>(SESSION_FILE, {});
  writeJson("subject.json", { name });
}

export function getSubjectName(): string {
  const s = readJson<{ name?: string }>("subject.json", {});
  return s.name || "亲爱的长辈";
}

// ===== 书稿 =====
const BOOK_FILE = "book.json";

export function saveBook(b: Book): void {
  writeJson(BOOK_FILE, b);
}

export function getBook(): Book | null {
  return readJson<Book | null>(BOOK_FILE, null);
}
